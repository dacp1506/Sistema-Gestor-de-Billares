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
import { Banknote, Calculator, Calendar, Loader2, X, Menu } from 'lucide-react-native';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import { listSales, type Sale } from '../services/sales';
import { colors, shadows } from '../theme';

type CajaShift = {
  id_caja: number | string;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  monto_inicial: number;
  total_calculado: number;
  monto_declarado: number;
  estado: 'abierta' | 'cerrada';
  nombre_usuario: string | null;
  id_sucursal: number | string;
};

type CajaStats = {
  totalAperturas: number;
  turnosAbiertos: number;
  turnosCerrados: number;
  ventasTotales: number;
  efectivoTotal: number;
};

export default function CajaScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const isGlobalAdmin = user.rol === 'admin_general';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchScope, setBranchScope] = useState(isGlobalAdmin ? 'all' : String(user.id_sucursal ?? ''));
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensual'>('diario');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<CajaShift[]>([]);
  const [stats, setStats] = useState<CajaStats | null>(null);
  const [selectedShift, setSelectedShift] = useState<CajaShift | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  useAccessibleModal(Boolean(selectedShift), () => setSelectedShift(null));

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const result = await listBranches();
      setBranches(result);
      setBranchScope((current) => (
        result.some((branch) => String(branch.id_sucursal) === current) ? current : String(result[0]?.id_sucursal || '')
      ));
    } catch (error) {
      setBranchError(getErrorMessage(error));
      setBranches([]);
      setBranchScope('');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  useEffect(() => { void loadBranches(); }, [loadBranches]);

  const loadShifts = useCallback(async (branchId: string | undefined, period: 'diario' | 'semanal' | 'mensual'): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sales for the period
      const branchFilter = branchScope === 'all' ? undefined : branchScope;
      const sales = await listSales(branchFilter);
      
      // Calculate stats and shifts
      const now = new Date();
      let periodStart: Date;
      
      switch (period) {
        case 'diario':
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'semanal':
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'mensual':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          periodStart = new Date(now.setHours(0, 0, 0, 0));
      }
      
      const periodSales = sales.filter((sale) => {
        const saleDate = new Date(sale.fecha_venta);
        if (Number.isNaN(saleDate.getTime())) return false;
        switch (period) {
          case 'diario':
            return saleDate >= periodStart && saleDate <= new Date(periodStart.getTime() + 86400000);
          case 'semanal':
            return saleDate >= periodStart && saleDate <= new Date();
          case 'mensual':
            return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
      
      const totalVentas = periodSales.reduce((sum, sale) => sum + Number(sale.total_productos || 0), 0);
      const turnosAbiertos = periodSales.length > 0 ? 1 : 0; // Simplified
      const turnosCerrados = 0; // Would query caja_turnos
      const efectivoTotal = totalVentas; // Would include caja movements
      
      const shiftStats: CajaStats = {
        totalAperturas: 0, // Would query
        turnosAbiertos,
        turnosCerrados,
        ventasTotales: totalVentas,
        efectivoTotal,
      };
      
      setStats(shiftStats);
      
      // In a full implementation, this would query caja_turnos
      // For now, we'll use placeholder data
      const placeholderShifts: CajaShift[] = [
        {
          id_caja: '1',
          fecha_apertura: new Date().toISOString().slice(0, 10),
          monto_inicial: 100,
          total_calculado: 100 + totalVentas,
          monto_declarado: 100 + totalVentas,
          estado: 'cerrada',
          nombre_usuario: user.nombre || 'Operador',
          id_sucursal: branchScope || '1',
        }
      ];
      
      setShifts(placeholderShifts);
    } catch (loadError) {
      setError(loadError instanceof ApiError || loadError instanceof Error ? loadError.message : 'No se pudo cargar la información de caja.');
      setShifts([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [branchScope, period]);

  useEffect(() => { void loadShifts(branchScope, period); }, [branchScope, period]);

  const handleOpenShift = () => {
    setOpenModal(true);
  };

  const handleCloseShift = async () => {
    if (!selectedShift || isClosing) return;
    setIsClosing(true);
    try {
      // Would call backend close endpoint
      setSelectedShift(null);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsClosing(false);
    }
  };

  const handlePrintShift = () => {
    if (!selectedShift || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;
    
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>Movimiento de Caja - Bola8</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #0f172a; }
          .no-print { display: none; }
          .page { margin-bottom: 40px; border-bottom: 1px solid #cbd5e1; padding-bottom: 20px; }
          h1, p { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #e2e8f0; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; }
          .muted { color: #64748b; font-size: 11px; }
          .logo { text-align: center; margin-bottom: 20px; }
          .brand { color: #10b981; font-weight: 900; font-size: 18px; }
        }
        body { font: 14px Arial, sans-serif; max-width: 360px; margin: 24px auto; color: #111; }
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
      </style></head><body>
        <div class="logo"><div class="brand">BOLA8</div><div class="concept">Movimiento de Caja ‒ Bola8</div></div>
        <div class="rule"></div>
        <h1>Movimiento de Caja</h1>
        <p class="muted">Sucursal: ${selectedShift?.id_sucursal}</p>
        <p class="muted">Cajero: ${selectedShift?.nombre_usuario || 'Operador'}</p>
        <p class="muted">Fecha Apertura: ${selectedShift?.fecha_apertura}</p>
        <div class="rule"></div>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px 3px;">Concepto</th>
              <th style="text-align:right; padding:6px 3px;">Bs.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Monto Inicial</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(selectedShift?.monto_inicial || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Total Calculado</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(selectedShift?.total_calculado || 0).toFixed(2)}</td>
            </tr>
            <tr style="${selectedShift?.monto_declarado >= selectedShift?.total_calculado ? 'background-color: #d1e7dd;' : 'background-color: #f8d7da;'}">
              <td style="text-align:left; font-weight:bold; padding:6px 3px;">Monto Declarado</td>
              <td style="text-align:right; padding:6px 3px;">Bs. ${Number(selectedShift?.monto_declarado || 0).toFixed(2)}</td>
            </tr>
            <tr style="font-weight:bold;">
              <td style="text-align:left; padding:6px 3px;">Estado</td>
              <td style="text-align:right; padding:6px 3px;">${selectedShift?.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</td>
            </tr>
          </tbody>
        </table>
        <div class="rule"></div>
        <p style="text-align:center; font-size:12px; color:#64748b;">
          Período consultado: ${period}
        </p>
        <div class="receipt-footer" style="margin-top:30px; border-top:1px solid #cbd5e1; padding-top:20px;">
          <p class="muted" style="font-size:11px; color:#64748b;">¡Gracias por operar en Bola8!</p>
        </div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const refresh = () => setShifts([]); // Force recalculation

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN · CAJA</Text>
            <Text style={styles.title}>Sistema de Caja y Turnos</Text>
            <Text style={styles.subtitle}>Aperturas, cierres y conciliación de efectivo</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar información de caja"
            disabled={loading}
            onPress={() => loadShifts(branchScope, period)}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            <Loader2 color={colors.accent} size="small" /> Actualizar
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>Cargando información de caja…</Text>
          </View>
        ) : error ? (
          <View style={styles.status}>
            <Text style={styles.errorTitle}>No se pudo cargar la información</Text>
            <Text style={styles.statusText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => loadShifts(branchScope, period)} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.mainContent}>
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Estadísticas del Período</Text>
                <Text style={styles.statsSubtitle}>Período: {period}</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}><Banknote color={colors.accent} size={20} /></Text>
                  <Text style={styles.statValue}>{Number(stats?.ventasTotales || 0).toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Ventas</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}><Calculator color={colors.info} size={20} /></Text>
                  <Text style={styles.statValue}>Bs. {Number(stats?.efectivoTotal || 0).toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Efectivo</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}><Calendar color={colors.warning} size={20} /></Text>
                  <Text style={styles.statValue}>{stats?.turnosAbiertos || 0}</Text>
                  <Text style={styles.statLabel}>Turnos Abiertos</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}><X color={colors.danger} size={20} /></Text>
                  <Text style={styles.statValue}>{stats?.turnosCerrados || 0}</Text>
                  <Text style={styles.statLabel}>Turnos Cerrados</Text>
                </View>
              </View>
            </View>

            {shifts.length > 0 ? (
              <View style={styles.shiftsCard}>
                <View style={styles.shiftsHeader}>
                  <Text style={styles.shiftsTitle}>Movimientos de Caja</Text>
                  <Text style={styles.shiftsSubtitle}>{shifts.length} registros</Text>
                </View>
                
                <View style={styles.shiftsList}>
                  {shifts.map((shift) => (
                    <View key={String(shift.id_caja)} style={styles.shiftRow}>
                      <View style={styles.shiftInfo}>
                        <Text style={styles.shiftRowTitle}>{shift.fecha_apertura}</Text>
                        <Text style={styles.shiftRowSubtitle}>{shift.nombre_usuario || 'Operador'}</Text>
                      </View>
                      <View style={styles.shiftAmount}>
                        <Text style={styles.shiftRowValue}>Bs. {Number(shift.total_calculado || 0).toFixed(2)}</Text>
                        <Text style={styles.shiftRowLabel}>Total</Text>
                      </View>
                      <View style={styles.shiftStatus}>
                        <Text style={styles.shiftRowStatus}>{shift.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                
                {selectedShift && (
                  <View style={styles.shiftDetail}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailTitle}>Detalle del Turno #{selectedShift.id_caja}</Text>
                      <Pressable accessibilityRole="button" onPress={() => setSelectedShift(null)} style={styles.detailCloseButton}>
                        <X color={colors.textMuted} size={16} /> Cerrar
                      </Pressable>
                    </View>
                    
                    <View style={styles.detailGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Monto Inicial</Text>
                        <Text style={styles.detailValue}>Bs. {Number(selectedShift.monto_inicial).toFixed(2)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Calculado</Text>
                        <Text style={styles.detailValue}>Bs. {Number(selectedShift.total_calculado).toFixed(2)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Monto Declarado</Text>
                        <Text style={styles.detailValue}>Bs. {Number(selectedShift.monto_declarado).toFixed(2)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Diferencia</Text>
                        <Text style={styles.detailValueDifference}>
                          {selectedShift.monto_declarado >= selectedShift.total_calculado 
                            ? '+' + (selectedShift.monto_declarado - selectedShift.total_calculado).toFixed(2)
                            : '-' + (selectedShift.total_calculado - selectedShift.monto_declarado).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.detailActions}>
                      {selectedShift.estado === 'abierta' ? (
                        <Pressable accessibilityRole="button" onPress={handleCloseShift} style={styles.closeButton}>
                          <Text style={styles.closeButtonText}>Cerrar Turno</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.closedText}>Turno Cerrado</Text>
                      )}
                      <Pressable accessibilityRole="button" onPress={handlePrintShift} style={styles.printButton}>
                        <Text style={styles.printButtonText}>Imprimir Recibo</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}><Banknote color={colors.textMuted} size={40} /></Text>
                <Text style={styles.emptyText}>No hay movimientos de caja para el período seleccionado.</Text>
                <Text style={styles.emptySubtitle}>Selecciona un período y sucursal para ver los registros.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsBar}>
          {shifts.length > 0 && selectedShift && selectedShift.estado === 'abierta' ? (
            <Pressable accessibilityRole="button" onPress={handleCloseShift} style={styles.closeButtonAction}>
              <Text style={styles.closeButtonActionText}>Cerrar Turno Actual</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => setShifts([])} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refrescar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
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
  pressed: { opacity: 0.78 },
  status: { alignItems: 'center', justifyContent: 'center', minHeight: 150, padding: 18, gap: 10, borderTopWidth: 1, borderColor: colors.border },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  statusText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  mainContent: { flex: 1 },
  statsCard: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadows },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.border },
  statsTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  statsSubtitle: { color: colors.textMuted, fontSize: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  statCard: { flex: 1, minWidth: 120, backgroundColor: colors.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 15 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8 },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  shiftsCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, ...shadows, marginTop: 16 },
  shiftsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.border },
  shiftsTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  shiftsSubtitle: { color: colors.textMuted, fontSize: 11 },
  shiftsList: { marginTop: 12 },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  shiftInfo: { flex: 1 },
  shiftRowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  shiftRowSubtitle: { color: colors.textMuted, fontSize: 10 },
  shiftAmount: { alignItems: 'flex-end', minWidth: 120 },
  shiftRowValue: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  shiftRowLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  shiftStatus: { marginLeft: 12 },
  shiftRowStatus: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  shiftRowStatusAbierta: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: colors.accent },
  shiftRowStatusCerrada: { backgroundColor: 'rgba(251, 113, 133, 0.12)', color: colors.danger },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { width: 40, height: 40 },
  emptyText: { fontSize: 16, marginTop: 12, color: colors.textMuted },
  emptySubtitle: { fontSize: 12, marginTop: 8, color: colors.textMuted },
  actionsBar: { padding: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 12 },
  closeButtonAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.accent, marginRight: 12 },
  closeButtonActionText: { color: '#04130d', fontSize: 14, fontWeight: '800' },
  closeButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.warning, marginRight: 12 },
  closeButtonText: { color: '#04130d', fontSize: 14, fontWeight: '800' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.border },
  detailCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.surfaceRaised },
  detailTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  detailGrid: { flexDirection: 'row', gap: 16, marginTop: 16 },
  detailRow: { flexDirection: 'column', gap: 8 },
  detailLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 18, fontWeight: '700' },
  detailValueDifference: { color: colors.warning, fontSize: 16, fontWeight: '600' },
  printButton: { minHeight: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  printButtonText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
  refreshButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 9, borderWidth: 1, borderColor: colors.accent },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  shiftDetail: { marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  closedText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', alignSelf: 'center' },
  disabled: { opacity: 0.55 },
});