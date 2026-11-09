import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BranchPicker } from '../components/BranchPicker';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { closeCashShift, listCashShifts, openCashShift, type CashShift } from '../services/cash';
import { listBranches } from '../services/products';
import { createSale, listSales, type Sale, type SaleInput } from '../services/sales';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

type SaleLine = { id_producto: string; cantidad: string };

type SaleForm = {
  id_usuario: string;
  tipo_venta: 'directa' | 'mesa';
  id_sesion: string;
  items: SaleLine[];
};

const emptyLine = (): SaleLine => ({ id_producto: '', cantidad: '1' });

export default function SalesScreen({ user }: { user: AuthUser }) {
  const [branches, setBranches] = useState<Array<{ id_sucursal: number | string; nombre: string; estado: boolean }>>([]);
  const [branchId, setBranchId] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashShifts, setCashShifts] = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [cashLoading, setCashLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [cashNotice, setCashNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [form, setForm] = useState<SaleForm>({
    id_usuario: String(user.id_usuario),
    tipo_venta: 'directa',
    id_sesion: '',
    items: [emptyLine()],
  });
  const [cashForm, setCashForm] = useState({ id_usuario: String(user.id_usuario), monto_inicial: '200', monto_declarado: '0' });

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchError(null);
    try {
      const result = await listBranches();
      setBranches(result);
      setBranchId((current) => (
        result.some((branch) => String(branch.id_sucursal) === current)
          ? current
          : String(result[0]?.id_sucursal || '')
      ));
    } catch (error) {
      setBranchError(getErrorMessage(error));
      setBranches([]);
      setBranchId('');
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadSales = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setSales([]);
      setSalesError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSalesError(null);
    try {
      const result = await listSales(selectedBranchId);
      setSales(result);
    } catch (error) {
      setSales([]);
      setSalesError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCashTurns = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setCashShifts([]);
      setCashError(null);
      setCashLoading(false);
      return;
    }

    setCashLoading(true);
    setCashError(null);
    try {
      const result = await listCashShifts(selectedBranchId);
      setCashShifts(result);
    } catch (error) {
      setCashShifts([]);
      setCashError(getErrorMessage(error));
    } finally {
      setCashLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    void loadSales(branchId);
    void loadCashTurns(branchId);
  }, [branchId, loadSales, loadCashTurns]);

  const totalToday = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.total_productos || 0), 0),
    [sales],
  );

  const addLine = () => setForm((current) => ({ ...current, items: [...current.items, emptyLine()] }));

  const updateLine = (index: number, field: 'id_producto' | 'cantidad', value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeLine = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length <= 1 ? [emptyLine()] : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const submitCashOpen = async () => {
    if (!branchId) {
      setCashNotice({ kind: 'error', text: 'Selecciona una sucursal antes de abrir un turno.' });
      return;
    }

    const idUsuario = Number(cashForm.id_usuario);
    const montoInicial = Number(cashForm.monto_inicial);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      setCashNotice({ kind: 'error', text: 'Ingresa un id_usuario válido para abrir el turno.' });
      return;
    }

    if (!Number.isFinite(montoInicial) || montoInicial < 0) {
      setCashNotice({ kind: 'error', text: 'El monto inicial debe ser mayor o igual a cero.' });
      return;
    }

    setCashSubmitting(true);
    setCashNotice(null);
    try {
      await openCashShift({
        id_sucursal: Number(branchId),
        id_usuario: idUsuario,
        monto_inicial: montoInicial,
      });
      setCashNotice({ kind: 'success', text: 'Turno abierto correctamente.' });
      setCashForm((current) => ({ ...current, id_usuario: String(idUsuario), monto_inicial: String(montoInicial) }));
      await loadCashTurns(branchId);
    } catch (error) {
      setCashNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setCashSubmitting(false);
    }
  };

  const submitCashClose = async (turnId: number | string) => {
    const montoDeclarado = Number(cashForm.monto_declarado);
    if (!Number.isFinite(montoDeclarado) || montoDeclarado < 0) {
      setCashNotice({ kind: 'error', text: 'El monto declarado debe ser mayor o igual a cero.' });
      return;
    }

    setCashSubmitting(true);
    setCashNotice(null);
    try {
      await closeCashShift(turnId, { monto_declarado: montoDeclarado });
      setCashNotice({ kind: 'success', text: 'Turno cerrado correctamente.' });
      setCashForm((current) => ({ ...current, monto_declarado: '0' }));
      await loadCashTurns(branchId);
    } catch (error) {
      setCashNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setCashSubmitting(false);
    }
  };

  const submitSale = async () => {
    if (!branchId) {
      setNotice({ kind: 'error', text: 'Selecciona una sucursal antes de registrar una venta.' });
      return;
    }

    const idUsuario = Number(form.id_usuario);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      setNotice({ kind: 'error', text: 'Ingresa un id_usuario válido.' });
      return;
    }

    const items = form.items
      .map((item) => ({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => Number.isInteger(item.id_producto) && item.id_producto > 0 && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (!items.length) {
      setNotice({ kind: 'error', text: 'Agrega al menos un producto con cantidad válida.' });
      return;
    }

    if (form.tipo_venta === 'mesa') {
      const idSesion = Number(form.id_sesion);
      if (!Number.isInteger(idSesion) || idSesion <= 0) {
        setNotice({ kind: 'error', text: 'Las ventas de mesa requieren un id_sesion válido.' });
        return;
      }
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const payload: SaleInput = {
        id_sucursal: Number(branchId),
        id_usuario: idUsuario,
        tipo_venta: form.tipo_venta,
        id_sesion: form.tipo_venta === 'mesa' ? Number(form.id_sesion) : null,
        items,
      };
      await createSale(payload);
      setNotice({ kind: 'success', text: 'Venta registrada correctamente.' });
      setForm({ id_usuario: String(idUsuario), tipo_venta: 'directa', id_sesion: '', items: [emptyLine()] });
      await loadSales(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>OPERACIÓN · CAJA</Text>
              <Text style={styles.pageTitle}>Ventas y caja</Text>
              <Text style={styles.subtitle}>Registro rápido de ventas por sucursal con validación de stock.</Text>
            </View>
          </View>

          <View style={styles.toolbar}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          </View>

          {branchesLoading ? (
            <StatusCard title="Cargando sucursales…" />
          ) : branchError ? (
            <StatusCard title={branchError} tone="error" />
          ) : null}

          <View style={styles.summaryGrid}>
            <MetricCard label="Ventas recientes" value={String(sales.length)} />
            <MetricCard label="Total vendido" value={`Bs. ${Number(totalToday).toFixed(2)}`} accent />
          </View>

          {notice ? (
            <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
              <Text style={styles.noticeText}>{notice.text}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loaderText}>Cargando ventas…</Text>
            </View>
          ) : salesError ? (
            <StatusCard title={salesError} tone="error" />
          ) : null}
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Turno de caja</Text>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>ID usuario</Text>
              <TextInput
                accessibilityLabel="ID de usuario del turno"
                keyboardType="numeric"
                editable={false}
                placeholder={String(user.id_usuario)}
                style={styles.input}
                value={cashForm.id_usuario}
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Monto inicial</Text>
              <TextInput
                accessibilityLabel="Monto inicial del turno"
                keyboardType="decimal-pad"
                onChangeText={(value) => setCashForm((current) => ({ ...current, monto_inicial: value }))}
                placeholder="200"
                style={styles.input}
                value={cashForm.monto_inicial}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Monto declarado al cerrar</Text>
            <TextInput
              accessibilityLabel="Monto declarado al cerrar el turno"
              keyboardType="decimal-pad"
              onChangeText={(value) => setCashForm((current) => ({ ...current, monto_declarado: value }))}
              placeholder="0"
              style={styles.input}
              value={cashForm.monto_declarado}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={cashSubmitting || !branchId}
            onPress={submitCashOpen}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!branchId || cashSubmitting) && styles.disabledButton]}
          >
            {cashSubmitting ? <ActivityIndicator color="#04130d" size="small" /> : <Text style={styles.primaryText}>Abrir turno</Text>}
          </Pressable>

          {cashNotice ? (
            <View style={[styles.notice, cashNotice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
              <Text style={styles.noticeText}>{cashNotice.text}</Text>
            </View>
          ) : null}

          {cashLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.loaderText}>Cargando turnos…</Text>
            </View>
          ) : cashError ? (
            <StatusCard title={cashError} tone="error" />
          ) : null}

          {!cashShifts.length ? (
            <Text style={styles.emptyText}>No hay turnos de caja registrados para esta sucursal.</Text>
          ) : (
            cashShifts.slice(0, 5).map((shift) => (
              <View key={String(shift.id_caja)} style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleTitle}>Turno #{shift.id_caja}</Text>
                  <Text style={[styles.saleAmount, shift.estado === 'abierta' ? styles.cashOpenText : styles.cashClosedText]}>{shift.estado === 'abierta' ? 'ABIERTO' : 'CERRADO'}</Text>
                </View>
                <Text style={styles.saleMeta}>Usuario {shift.id_usuario} · Inicial: Bs. {Number(shift.monto_inicial || 0).toFixed(2)}</Text>
                <Text style={styles.saleMeta}>{shift.fecha_apertura ? new Date(shift.fecha_apertura).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin apertura'}</Text>
                {shift.estado === 'abierta' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => submitCashClose(shift.id_caja)}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryText}>Cerrar turno</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.saleMeta}>Cierre: {shift.fecha_cierre ? new Date(shift.fecha_cierre).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin cierre'} · Declarado: Bs. {Number(shift.monto_declarado || 0).toFixed(2)}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.mainGrid}>
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Registrar venta</Text>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>ID usuario</Text>
                <TextInput
                  accessibilityLabel="ID de usuario de la venta"
                  keyboardType="numeric"
                  editable={false}
                  placeholder={String(user.id_usuario)}
                  style={styles.input}
                  value={form.id_usuario}
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Tipo de venta</Text>
                <View
                  accessibilityLabel="Tipo de venta"
                  accessibilityRole="radiogroup"
                  onKeyDownCapture={(event) => {
                    const key = event.nativeEvent.key;
                    const options = ['directa', 'mesa'] as const;
                    const group = Platform.OS === 'web' && typeof document !== 'undefined'
                      ? document.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Tipo de venta"]')
                      : null;
                    const radios = group ? Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]')) : [];
                    const focusedIndex = Platform.OS === 'web' && typeof document !== 'undefined'
                      ? radios.indexOf(document.activeElement as HTMLElement)
                      : -1;
                    const currentIndex = focusedIndex >= 0 ? focusedIndex : options.indexOf(form.tipo_venta);
                    const forward = key === 'ArrowRight' || key === 'ArrowDown';
                    const backward = key === 'ArrowLeft' || key === 'ArrowUp';
                    const activate = key === ' ' || key === 'Enter' || event.nativeEvent.code === 'Space';
                    if (!forward && !backward && !activate) return;

                    event.preventDefault();
                    const nextIndex = forward
                      ? (currentIndex + 1) % options.length
                      : backward
                        ? (currentIndex - 1 + options.length) % options.length
                        : currentIndex;
                    const nextOption = options[nextIndex];
                    setForm((current) => ({ ...current, tipo_venta: nextOption }));
                    if (Platform.OS === 'web') requestAnimationFrame(() => radios[nextIndex]?.focus());
                  }}
                  style={styles.segmentRow}
                >
                  {(['directa', 'mesa'] as const).map((option) => (
                    <Pressable
                      aria-checked={form.tipo_venta === option}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: form.tipo_venta === option }}
                      key={option}
                      onPress={() => setForm((current) => ({ ...current, tipo_venta: option }))}
                      style={[styles.segmentOption, form.tipo_venta === option && styles.segmentOptionActive]}
                    >
                      <Text style={[styles.segmentText, form.tipo_venta === option && styles.segmentTextActive]}>{option === 'directa' ? 'Directa' : 'Mesa'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {form.tipo_venta === 'mesa' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>ID sesión de mesa</Text>
                <TextInput
                  accessibilityLabel="ID de sesión de mesa"
                  keyboardType="numeric"
                  onChangeText={(value) => setForm((current) => ({ ...current, id_sesion: value }))}
                  placeholder="Ej. 12"
                  style={styles.input}
                  value={form.id_sesion}
                />
              </View>
            ) : null}

            <View style={styles.itemsHeader}>
              <Text style={styles.label}>Productos</Text>
              <Pressable accessibilityRole="button" onPress={addLine} style={styles.addButton}>
                <Text style={styles.addButtonText}>＋ Añadir</Text>
              </Pressable>
            </View>

            {form.items.map((item, index) => (
              <View key={`line-${index}`} style={styles.itemRow}>
                <TextInput
                  accessibilityLabel="ID de producto"
                  keyboardType="numeric"
                  onChangeText={(value) => updateLine(index, 'id_producto', value)}
                  placeholder="ID producto"
                  style={[styles.input, styles.itemInput]}
                  value={item.id_producto}
                />
                <TextInput
                  accessibilityLabel="Cantidad de producto"
                  keyboardType="numeric"
                  onChangeText={(value) => updateLine(index, 'cantidad', value)}
                  placeholder="Cant."
                  style={[styles.input, styles.itemInputSmall]}
                  value={item.cantidad}
                />
                <Pressable accessibilityLabel="Quitar producto" accessibilityRole="button" onPress={() => removeLine(index)} style={styles.removeButton}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              accessibilityRole="button"
              disabled={submitting || !branchId}
              onPress={submitSale}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!branchId || submitting) && styles.disabledButton]}
            >
              {submitting ? <ActivityIndicator color="#04130d" size="small" /> : <Text style={styles.primaryText}>Registrar venta</Text>}
            </Pressable>
          </View>

          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Historial reciente</Text>
            {!sales.length ? (
              <Text style={styles.emptyText}>Sin ventas registradas en esta sucursal.</Text>
            ) : (
              sales.slice(0, 6).map((sale) => (
                <View key={String(sale.id_venta)} style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <Text style={styles.saleTitle}>Venta #{sale.id_venta}</Text>
                    <Text style={styles.saleAmount}>Bs. {Number(sale.total_productos || 0).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.saleMeta}>{new Date(sale.fecha_venta).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                  <Text style={styles.saleMeta}>{sale.tipo_venta === 'mesa' ? 'Venta por mesa' : 'Venta directa'} · Usuario {sale.id_usuario}</Text>
                  <Text style={styles.saleMeta}>{sale.detalles?.length ? `${sale.detalles.length} líneas` : 'Sin detalle'}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado en la operación.';
}

function StatusCard({ title, tone = 'info' }: { title: string; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.statusCard, tone === 'error' && styles.statusCardError]}>
      <Text style={[styles.statusText, tone === 'error' && styles.statusTextError]}>{title}</Text>
    </View>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.metricCard, accent && styles.metricCardAccent]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 18 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows,
  },
  headerRow: { marginBottom: 10 },
  titleWrap: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.textMuted, marginTop: 6, fontSize: 14 },
  toolbar: { marginTop: 12 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  metricCardAccent: { borderColor: colors.accent },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  notice: { marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700' },
  loaderWrap: { marginTop: 16, alignItems: 'center', paddingVertical: 14 },
  loaderText: { color: colors.textMuted, marginTop: 8 },
  statusCard: { marginTop: 12, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statusCardError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusText: { color: colors.text, fontWeight: '700' },
  statusTextError: { color: '#ffd4dc' },
  mainGrid: { flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  panelCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  panelTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldHalf: { flex: 1 },
  fieldGroup: { marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentOption: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  segmentOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  segmentText: { color: colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: colors.accent },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
  addButton: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  addButtonText: { color: colors.accent, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  itemInput: { flex: 1 },
  itemInputSmall: { width: 86 },
  removeButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.danger, fontWeight: '800' },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: { color: '#04130d', fontWeight: '800', fontSize: 14 },
  secondaryText: { color: colors.warning, fontWeight: '800', fontSize: 12 },
  pressed: { opacity: 0.86 },
  disabledButton: { opacity: 0.5 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  cashOpenText: { color: colors.accent, fontWeight: '800' },
  cashClosedText: { color: colors.textMuted, fontWeight: '800' },
  saleCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleTitle: { color: colors.text, fontWeight: '800' },
  saleAmount: { color: colors.accent, fontWeight: '800' },
  saleMeta: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
});
