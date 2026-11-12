import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Banknote,
  CalendarDays,
  Printer,
  ReceiptText,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import { listSales, type Sale } from '../services/sales';
import { getSettings, type UserSettings } from '../services/settings';
import { colors, shadows } from '../theme';

type DateFilter = 'today' | 'yesterday' | 'all';
type TypeFilter = 'all' | 'mesa' | 'directa';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(value: unknown) {
  if (value == null) return '';
  const str = String(value);
  return str.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character));
}

export default function HistoryScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const isGlobalAdmin = user.rol === 'admin_general';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchScope, setBranchScope] = useState(isGlobalAdmin ? 'all' : String(user.id_sucursal ?? ''));
  const [sales, setSales] = useState<Sale[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  useAccessibleModal(Boolean(selectedSale), () => setSelectedSale(null));

  useEffect(() => {
    let active = true;
    void getSettings()
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    return () => { active = false; };
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchList, saleList] = await Promise.all([
        listBranches(),
        listSales(branchScope === 'all' ? undefined : branchScope),
      ]);
      setBranches(branchList);
      setSales(saleList);
    } catch (loadError) {
      setError(loadError instanceof ApiError || loadError instanceof Error
        ? loadError.message
        : 'No se pudo cargar el historial.');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [branchScope]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const visibleSales = useMemo(() => {
    const now = new Date();
    const today = dateKey(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = dateKey(yesterdayDate);

    return sales.filter((sale) => {
      const saleDate = new Date(sale.fecha_venta);
      if (Number.isNaN(saleDate.getTime())) return false;
      if (dateFilter === 'today' && dateKey(saleDate) !== today) return false;
      if (dateFilter === 'yesterday' && dateKey(saleDate) !== yesterday) return false;
      if (typeFilter !== 'all' && sale.tipo_venta !== typeFilter) return false;
      return true;
    });
  }, [dateFilter, sales, typeFilter]);

  const total = visibleSales.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const average = visibleSales.length ? total / visibleSales.length : 0;

  const printReceipt = () => {
    if (!selectedSale || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) {
      setPrintError('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo otra vez.');
      return;
    }
    setPrintError(null);

    const isA4 = settings?.formato_impresion === 'A4';
    const commercialName = settings?.nombre_comercial?.trim() || 'BOLA8';
    const pageSize = isA4 ? 'A4' : '80mm auto';
    const pageMargin = isA4 ? '14mm' : '6mm';
    const bodyWidth = isA4 ? '720px' : '360px';
    const bodyFontSize = isA4 ? '13px' : '14px';

    const itemsHtml = (selectedSale.detalles || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.nombre || `Producto ${item.id_producto}`)}</td>
        <td>${escapeHtml(item.cantidad)}</td>
        <td>Bs. ${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const timestamp = new Date(selectedSale.fecha_venta).toLocaleString('es-BO');
    const tableSale = isTableSale(selectedSale);
    const minutes = saleMinutes(selectedSale);
    const rate = Number(selectedSale.tarifa_minuto || 0);
    const rental = Number(selectedSale.total_tiempo || 0);
    const products = Number(selectedSale.total_productos || 0);
    const grandTotal = saleTotal(selectedSale);
    const tableLabel = selectedSale.numero_mesa ? `Mesa ${selectedSale.numero_mesa}` : `Mesa (sesión ${selectedSale.id_sesion})`;
    const rentalRowHtml = tableSale
      ? `<tr><td>Alquiler de mesa (${minutes} min)</td><td>1</td><td>Bs. ${rental.toFixed(2)}</td></tr>`
      : '';

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>Recibo #${escapeHtml(selectedSale.id_venta)}</title>
      <style>
        @page { size: ${pageSize}; margin: ${pageMargin}; }
        @media print {
          body { margin: 0; padding: ${isA4 ? '24px' : '20px'}; font-family: Arial, sans-serif; color: #0f172a; }
          .no-print { display: none; }
          .page { margin-bottom: 40px; border-bottom: 1px solid #cbd5e1; padding-bottom: 20px; }
          h1, p { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #e2e8f0; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; }
          .muted { color: #64748b; font-size: 11px; }
          .logo { text-align: center; margin-bottom: 20px; }
          .brand { color: #10b981; font-weight: 900; font-size: 18px; }
          .receipt-footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 20px; }
        }
        body { font: ${bodyFontSize} Arial, sans-serif; max-width: ${bodyWidth}; margin: 24px auto; color: #111; }
        h1, p { text-align: center; margin: 6px 0; }
        h1 { font-size: 20px; }
        .muted { color: #555; font-size: 12px; }
        .rule { border-top: 1px dashed #555; margin: 14px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { text-align: left; padding: 6px 3px; border-bottom: 1px solid #ddd; }
        th:last-child, td:last-child { text-align: right; }
        .total { text-align: right; font-size: 18px; font-weight: bold; }
        .label { font-weight: 600; color: #334155; }
        .value { text-align: right; color: #0f172a; }
        .brand { color: #0f172a; font-size: 15; font-weight: 900; letter-spacing: 2; margin-top: 6; }
        .concept { color: #64748b; font-size: 11; margin-top: 2; }
        .method { color: #64748b; font-size: 11; margin-top: 2; }
      </style></head><body>
        <div class="logo"><div class="brand">${escapeHtml(commercialName)}</div><div class="concept">Comprobante de Venta ‒ Bola8</div></div>
        <div class="rule"></div>
        <p>Recibo #${escapeHtml(selectedSale.id_venta)}</p>
        <p class="muted">${escapeHtml(timestamp)}</p>
        <p class="muted">${escapeHtml(selectedSale.nombre_sucursal || 'Sucursal')} · ${selectedSale.tipo_venta === 'mesa' ? 'Consumo de mesa' : 'Venta directa POS'}</p>
        ${tableSale ? `<p class="muted">${escapeHtml(tableLabel)} · ${minutes} min × Bs. ${rate.toFixed(2)} = Bs. ${rental.toFixed(2)}</p>` : ''}
        <p class="muted">Cajero: ${escapeHtml(selectedSale.nombre_usuario || 'Operador')}</p>
        <div class="rule" style="margin:20px 0;"></div>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px 3px;">Producto</th>
              <th style="text-align:center; padding:6px 3px;">Cant.</th>
              <th style="text-align:right; padding:6px 3px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rentalRowHtml}
            ${itemsHtml ? itemsHtml : '<tr><td colspan="3" style="text-align:center; padding:16px; color:#64748b;">Sin productos registrados</td></tr>'}
          </tbody>
        </table>
        <div class="rule" style="margin:20px 0;"></div>
        ${tableSale ? `<p style="text-align:right; font-size:12px; color:#334155; margin:2px 0;">Productos: Bs. ${products.toFixed(2)}</p>` : ''}
        <p style="text-align:right; font-size:18px; font-weight:bold; color:#0f172a;">Total: Bs. ${grandTotal.toFixed(2)}</p>
        <p class="muted" style="font-size:11px; color:#64748b;">Pago: ${escapeHtml('Efectivo / QR')}</p>
        <div class="receipt-footer" style="margin-top:30px; border-top:1px solid #cbd5e1; padding-top:20px;">
          <p class="muted" style="font-size:11px; color:#64748b;">¡Gracias por jugar en Bola8!</p>
        </div>
      </body></html>`);
    printWindow.document.close();
    // Wait for the new document to finish layout before opening the print
    // dialog; printing immediately can produce a blank page in some browsers.
    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  };

  const visibleSalesCount = visibleSales.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>OPERACIÓN · COMPROBANTES</Text>
            <Text style={styles.title}>Historial y recibos</Text>
            <Text style={styles.subtitle}>Consulta ventas registradas y vuelve a imprimir sus comprobantes.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => { void loadHistory(); }}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            <ReceiptText color={colors.accent} size={17} />
            <Text style={styles.refreshText}>{loading ? 'Actualizando…' : 'Actualizar'}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {isGlobalAdmin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: branchScope === 'all' }}
              onPress={() => setBranchScope('all')}
              style={({ pressed }) => [styles.filterChip, branchScope === 'all' && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={styles.filterText}>Todas las sucursales</Text>
            </Pressable>
          ) : null}
          {branches.map((branch) => (
            <Pressable
              key={String(branch.id_sucursal)}
              accessibilityRole="button"
              accessibilityState={{ selected: branchScope === String(branch.id_sucursal) }}
              onPress={() => setBranchScope(String(branch.id_sucursal))}
              style={({ pressed }) => [styles.filterChip, branchScope === String(branch.id_sucursal) && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={styles.filterText}>{branch.nombre}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'today' }}
            onPress={() => setDateFilter('today')}
            style={({ pressed }) => [styles.filterChip, dateFilter === 'today' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Hoy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'yesterday' }}
            onPress={() => setDateFilter('yesterday')}
            style={({ pressed }) => [styles.filterChip, dateFilter === 'yesterday' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Ayer</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'all' }}
            onPress={() => setDateFilter('all')}
            style={({ pressed }) => [styles.filterChip, dateFilter === 'all' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Todas las fechas</Text>
          </Pressable>
          <View style={styles.filterDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: typeFilter === 'all' }}
            onPress={() => setTypeFilter('all')}
            style={({ pressed }) => [styles.filterChip, typeFilter === 'all' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Todos los tipos</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: typeFilter === 'mesa' }}
            onPress={() => setTypeFilter('mesa')}
            style={({ pressed }) => [styles.filterChip, typeFilter === 'mesa' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Mesa + consumo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: typeFilter === 'directa' }}
            onPress={() => setTypeFilter('directa')}
            style={({ pressed }) => [styles.filterChip, typeFilter === 'directa' && styles.filterChipActive, pressed && styles.pressed]}
          >
            <Text style={styles.filterText}>Venta directa</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.metrics}>
          <MetricCard icon={Banknote} label="Total recaudado · filtro" value={`Bs. ${total.toFixed(2)}`} accent />
          <MetricCard icon={ReceiptText} label="Recibos emitidos" value={String(visibleSalesCount)} />
          <MetricCard icon={CalendarDays} label="Ticket promedio" value={`Bs. ${average.toFixed(2)}`} warning />
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>Recibos</Text>
              <Text style={styles.listSubtitle}>
                {sales.length >= 100 ? 'Mostrando hasta las 100 operaciones más recientes.' : 'Datos consultados desde el sistema.'}
              </Text>
            </View>
            <Text style={styles.count}>{visibleSalesCount} {visibleSalesCount === 1 ? 'venta' : 'ventas'}</Text>
          </View>

          {loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.statusText}>Cargando historial…</Text>
            </View>
          ) : error ? (
            <View style={styles.status}>
              <Text style={styles.errorTitle}>No se pudo cargar el historial</Text>
              <Text style={styles.statusText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => { void loadHistory(); }} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : visibleSalesCount === 0 ? (
            <View style={styles.status}>
              <Text style={styles.statusText}>No hay ventas para los filtros seleccionados.</Text>
            </View>
          ) : visibleSales.map((sale) => (
            <Pressable
              accessibilityRole="button"
              key={String(sale.id_venta)}
              onPress={() => { setSelectedSale(sale); setPrintError(null); }}
              style={({ pressed }) => [styles.saleRow, compact && styles.saleRowCompact, pressed && styles.pressed]}
            >
              <View style={styles.saleIdentity}>
                <View style={styles.receiptIcon}><ReceiptText color={colors.accent} size={17} /></View>
                <View style={styles.saleCopy}>
                  <Text style={styles.saleTitle}>Recibo #{sale.id_venta}</Text>
                  <Text style={styles.saleMeta}>{formatDate(sale.fecha_venta)}</Text>
                  <Text numberOfLines={1} style={styles.saleMeta}>
                    {sale.nombre_sucursal || `Sucursal ${sale.id_sucursal}`} · {sale.nombre_usuario || `Operador ${sale.id_usuario}`}
                    {isTableSale(sale) ? ` · ${saleMinutes(sale)} min` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleKind}>{sale.tipo_venta === 'mesa' ? 'Mesa + consumo' : 'Venta directa POS'}</Text>
                <Text style={styles.saleAmount}>Bs. {saleTotal(sale).toFixed(2)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSelectedSale(null)} transparent visible={Boolean(selectedSale)}>
        {selectedSale ? (
          <View style={styles.modalLayer}>
            <Pressable accessibilityLabel="Cerrar recibo" onPress={() => setSelectedSale(null)} style={styles.backdrop} />
            <View accessibilityViewIsModal style={styles.receiptModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>COMPROBANTE DE VENTA</Text>
                  <Text style={styles.modalTitle}>Recibo #{selectedSale.id_venta}</Text>
                </View>
                <Pressable accessibilityLabel="Cerrar detalle del recibo" accessibilityRole="button" onPress={() => setSelectedSale(null)} style={styles.closeButton}>
                  <X color={colors.textMuted} size={20} />
                </Pressable>
              </View>

              <ScrollView style={styles.receiptBody}>
                <ReceiptInfo label="Fecha y hora" value={formatDate(selectedSale.fecha_venta)} />
                <ReceiptInfo label="Sucursal" value={selectedSale.nombre_sucursal || `Sucursal ${selectedSale.id_sucursal}`} />
                <ReceiptInfo label="Atendido por" value={selectedSale.nombre_usuario || `Operador ${selectedSale.id_usuario}`} />
                <ReceiptInfo label="Tipo" value={selectedSale.tipo_venta === 'mesa' ? `Mesa + consumo · sesión ${selectedSale.id_sesion}` : 'Venta directa POS'} />
                {isTableSale(selectedSale) ? (
                  <>
                    <ReceiptInfo
                      label="Mesa"
                      value={selectedSale.numero_mesa ? `Mesa ${selectedSale.numero_mesa}` : `Mesa (sesión ${selectedSale.id_sesion})`}
                    />
                    <ReceiptInfo label="Tiempo utilizado" value={`${saleMinutes(selectedSale)} min`} />
                    <ReceiptInfo
                      label="Tarifa por minuto"
                      value={`Bs. ${Number(selectedSale.tarifa_minuto || 0).toFixed(2)}`}
                    />
                  </>
                ) : null}
                <ReceiptInfo label="Pago" value={'Efectivo / QR'} />
                <View style={styles.receiptDivider} />
                {isTableSale(selectedSale) ? (
                  <View style={styles.receiptItem}>
                    <View style={styles.receiptItemCopy}>
                      <Text style={styles.receiptItemName}>Alquiler de mesa</Text>
                      <Text style={styles.receiptItemMeta}>
                        {saleMinutes(selectedSale)} min × Bs. {Number(selectedSale.tarifa_minuto || 0).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.receiptItemTotal}>Bs. {Number(selectedSale.total_tiempo || 0).toFixed(2)}</Text>
                  </View>
                ) : null}
                <Text style={styles.itemsHeading}>Productos</Text>
                {selectedSale.detalles?.length ? selectedSale.detalles.map((item) => (
                  <View key={String(item.id_detalle)} style={styles.receiptItem}>
                    <View style={styles.receiptItemCopy}>
                      <Text style={styles.receiptItemName}>{item.nombre || `Producto ${item.id_producto}`}</Text>
                      <Text style={styles.receiptItemMeta}>{item.cantidad} × Bs. {Number(item.precio_unitario).toFixed(2)}</Text>
                    </View>
                    <Text style={styles.receiptItemTotal}>Bs. {Number(item.subtotal).toFixed(2)}</Text>
                  </View>
                )) : <Text style={styles.emptyDetails}>El detalle de artículos no está disponible para esta venta.</Text>}
                <View style={styles.receiptDivider} />
                {isTableSale(selectedSale) ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal alquiler</Text>
                    <Text style={styles.totalLabel}>Bs. {Number(selectedSale.total_tiempo || 0).toFixed(2)}</Text>
                  </View>
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal productos</Text>
                  <Text style={styles.totalLabel}>Bs. {Number(selectedSale.total_productos || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalValue}>Bs. {saleTotal(selectedSale).toFixed(2)}</Text>
                </View>
                {printError ? <Text style={styles.printError}>{printError}</Text> : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={() => setSelectedSale(null)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Cerrar</Text>
                </Pressable>
                {Platform.OS === 'web' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Imprimir o guardar el recibo en PDF"
                    onPress={printReceipt}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  >
                    <Printer color="#04130d" size={16} />
                    <Text style={styles.primaryText}>Imprimir / Guardar PDF</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-BO');
}

function isTableSale(sale: Sale) {
  return sale.tipo_venta === 'mesa' && sale.id_sesion != null;
}

function saleMinutes(sale: Sale) {
  const minutes = Number(sale.minutos_totales);
  return Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
}

function saleTotal(sale: Sale) {
  return Number((Number(sale.total_productos || 0) + Number(sale.total_tiempo || 0)).toFixed(2));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = false,
  warning = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <View style={[
      styles.metricCard,
      accent && styles.metricCardAccent,
      warning && styles.metricCardWarning,
    ]}>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text numberOfLines={1} style={[styles.metricValue, accent && styles.metricValueAccent, warning && styles.metricValueWarning]}>{value}</Text>
      </View>
      <View style={[styles.metricIcon, accent && styles.metricIconAccent, warning && styles.metricIconWarning]}>
        <Icon color={accent ? colors.accent : warning ? colors.warning : colors.info} size={19} />
      </View>
    </View>
  );
}

function ReceiptInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 5, lineHeight: 18 },
  refreshButton: {
    minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  filterChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.45)' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterDivider: { width: 1, height: 22, backgroundColor: colors.border, marginHorizontal: 4 },
  metrics: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1, minWidth: 0, minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    ...(shadows || {}),
  },
  metricCardAccent: { borderColor: 'rgba(16, 185, 129, 0.27)' },
  metricCardWarning: { borderColor: 'rgba(251, 191, 36, 0.22)' },
  metricCopy: { flex: 1, minWidth: 0 },
  metricLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 8 },
  metricValueAccent: { color: colors.accent },
  metricValueWarning: { color: colors.warning },
  metricIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  metricIconAccent: { backgroundColor: colors.accentSoft },
  metricIconWarning: { backgroundColor: colors.warningSoft },
  listCard: { padding: 18, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  listSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  count: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  saleRow: {
    minHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border,
  },
  saleRowCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 9 },
  saleIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  receiptIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  saleCopy: { flex: 1, minWidth: 0 },
  saleTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  saleMeta: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  saleRight: { alignItems: 'flex-end', minWidth: 125 },
  saleKind: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  saleAmount: { color: colors.accent, fontSize: 16, fontWeight: '900', marginTop: 5 },
  status: { alignItems: 'center', justifyContent: 'center', minHeight: 150, padding: 18, gap: 10, borderTopWidth: 1, borderColor: colors.border },
  statusText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  retryButton: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  modalLayer: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2, 6, 23, 0.78)' },
  receiptModal: {
    width: '100%', maxWidth: 560, maxHeight: '88%', padding: 20, borderRadius: 17,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...(shadows || {}),
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.border },
  modalEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.surfaceRaised },
  receiptBody: { flexGrow: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingTop: 13 },
  infoLabel: { color: colors.textMuted, fontSize: 11 },
  infoValue: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  receiptDivider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 15 },
  itemsHeading: { color: colors.text, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  receiptItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.border },
  receiptItemCopy: { flex: 1 },
  receiptItemName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  receiptItemMeta: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  receiptItemTotal: { color: colors.text, fontSize: 11, fontWeight: '800', alignSelf: 'center' },
  emptyDetails: { color: colors.textMuted, fontSize: 11, paddingVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  totalValue: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  printError: { color: colors.danger, fontSize: 11, marginTop: 10, textAlign: 'center' },
  secondaryButton: { minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, flexWrap: 'wrap', marginTop: 12 },
  primaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  primaryText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
});
