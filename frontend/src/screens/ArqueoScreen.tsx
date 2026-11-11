import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Banknote, Lock, RefreshCw } from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { OptionPicker } from '../components/OptionPicker';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { closeCashShift, listCashShifts, openCashShift, type CashShift } from '../services/cash';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import { listUsers, type User } from '../services/users';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string };

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export default function ArqueoScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const isGlobalAdmin = user.rol === 'admin_general';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState(isGlobalAdmin ? '' : String(user.id_sucursal ?? ''));
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [lastClosedId, setLastClosedId] = useState('');
  const [declared, setDeclared] = useState('');
  const [openAmount, setOpenAmount] = useState('200');
  const [openOperatorId, setOpenOperatorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<'open' | 'close' | null>(null);

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const result = await listBranches();
      setBranches(result);
      setBranchId((current) => (
        result.some((branch) => String(branch.id_sucursal) === current)
          ? current
          : String(result[0]?.id_sucursal || '')
      ));
    } catch (loadError) {
      setBranchError(getErrorMessage(loadError));
      setBranches([]);
      setBranchId('');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  const loadShiftData = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setShifts([]);
      setOperators([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [shiftList, userList] = await Promise.all([
        listCashShifts(selectedBranchId),
        isGlobalAdmin ? listUsers(selectedBranchId) : Promise.resolve([] as User[]),
      ]);
      setShifts(shiftList);
      setOperators(
        userList.filter((operator) => (
          operator.activo && (operator.rol === 'cajero' || operator.rol === 'admin_sucursal')
        )),
      );
    } catch (loadError) {
      setShifts([]);
      setOperators([]);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [isGlobalAdmin]);

  useEffect(() => { void loadBranches(); }, [loadBranches]);
  useEffect(() => { void loadShiftData(branchId); }, [branchId, loadShiftData]);
  useEffect(() => { setDeclared(''); }, [branchId]);

  const openShifts = useMemo(
    () => shifts.filter((shift) => shift.estado === 'abierta'),
    [shifts],
  );

  const selectedOpenShift = useMemo(
    () => openShifts.find((shift) => String(shift.id_caja) === selectedShiftId) || openShifts[0] || null,
    [openShifts, selectedShiftId],
  );

  const closedShift = useMemo(
    () => (!selectedOpenShift && lastClosedId
      ? shifts.find((shift) => String(shift.id_caja) === lastClosedId) || null
      : null),
    [lastClosedId, selectedOpenShift, shifts],
  );

  const displayShift = selectedOpenShift || closedShift;
  const isOpen = Boolean(selectedOpenShift);

  const availableOperators = useMemo(
    () => operators.filter((operator) => (
      !openShifts.some((shift) => String(shift.id_usuario) === String(operator.id_usuario))
    )),
    [openShifts, operators],
  );

  const operatorOptions = useMemo(
    () => availableOperators.map((operator) => ({
      value: String(operator.id_usuario),
      label: operator.nombre,
      description: operator.username || operator.rol.replaceAll('_', ' '),
    })),
    [availableOperators],
  );

  useEffect(() => {
    if (!isGlobalAdmin) return;
    setOpenOperatorId((current) => (
      availableOperators.some((operator) => String(operator.id_usuario) === current)
        ? current
        : String(availableOperators[0]?.id_usuario || '')
    ));
  }, [availableOperators, isGlobalAdmin]);

  const selectedBranchName = branches.find((branch) => String(branch.id_sucursal) === branchId)?.nombre;

  const baseAmount = displayShift ? Number(displayShift.monto_inicial || 0) : 0;
  const rentalIncome = displayShift ? Number(displayShift.ingresos_alquiler || 0) : 0;
  const posIncome = displayShift ? Number(displayShift.ingresos_pos || 0) : 0;
  const expectedTotal = displayShift
    ? Number(displayShift.total_calculado ?? (baseAmount + rentalIncome + posIncome))
    : 0;

  const declaredText = isOpen
    ? declared
    : displayShift?.monto_declarado != null
      ? String(displayShift.monto_declarado)
      : '';
  const hasDeclared = declaredText.trim() !== '' && Number.isFinite(Number(declaredText));
  const declaredValue = hasDeclared ? Number(declaredText) : 0;
  const difference = hasDeclared ? Number((declaredValue - expectedTotal).toFixed(2)) : 0;
  const isExact = hasDeclared && Math.abs(difference) < 0.01;

  const resultAmount = !hasDeclared
    ? 'Bs. 0.00'
    : isExact
      ? 'Bs. 0.00'
      : `${difference > 0 ? '+' : '-'}Bs. ${Math.abs(difference).toFixed(2)}`;
  const resultLabel = !hasDeclared
    ? (isOpen ? 'Ingresa el efectivo contado para calcular' : 'El turno no registra efectivo declarado')
    : isExact
      ? '✓ Caja Cuadrada Exacta'
      : difference > 0
        ? 'Sobrante en caja'
        : '⚠ Faltante en caja';
  const resultTone = !hasDeclared
    ? styles.resultMuted
    : isExact
      ? styles.resultSuccess
      : difference > 0
        ? styles.resultInfo
        : styles.resultDanger;

  const statusLabel = isOpen ? 'Caja Abierta' : displayShift ? 'Turno Cerrado y Auditado' : 'Caja Cerrada';
  const shiftLabel = displayShift
    ? `Turno #${displayShift.id_caja} · ${displayShift.nombre_usuario || `Operador ${displayShift.id_usuario}`}`
    : null;

  const openShift = async () => {
    if (!branchId) {
      setNotice({ kind: 'error', text: 'Selecciona una sucursal antes de abrir un turno.' });
      return;
    }

    const amount = Number(openAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice({ kind: 'error', text: 'La base inicial debe ser un número mayor o igual a cero.' });
      return;
    }

    let operator = Number(user.id_usuario);
    if (isGlobalAdmin) {
      const selectedOperator = availableOperators.find((item) => String(item.id_usuario) === openOperatorId);
      if (!selectedOperator) {
        setNotice({ kind: 'error', text: 'Selecciona un operador disponible para abrir el turno.' });
        return;
      }
      operator = Number(selectedOperator.id_usuario);
    }

    setBusy('open');
    setNotice(null);
    try {
      const shift = await openCashShift({
        id_sucursal: Number(branchId),
        id_usuario: operator,
        monto_inicial: amount,
      });
      setLastClosedId('');
      setSelectedShiftId(String(shift.id_caja));
      setDeclared('');
      setNotice({ kind: 'success', text: `Turno #${shift.id_caja} abierto con una base de Bs. ${amount.toFixed(2)}.` });
      await loadShiftData(branchId);
    } catch (openError) {
      setNotice({ kind: 'error', text: getErrorMessage(openError) });
    } finally {
      setBusy(null);
    }
  };

  const executeClose = async () => {
    if (!selectedOpenShift) return;
    if (!hasDeclared) {
      setNotice({ kind: 'error', text: 'Ingresa el efectivo físico contado antes de cerrar el turno.' });
      return;
    }

    setBusy('close');
    setNotice(null);
    try {
      const closed = await closeCashShift(selectedOpenShift.id_caja, {
        monto_declarado: Number(declaredText),
      });
      setLastClosedId(String(closed.id_caja));
      setSelectedShiftId('');
      setDeclared('');
      setNotice({ kind: 'success', text: 'Arqueo y cierre de turno registrado correctamente.' });
      await loadShiftData(branchId);
    } catch (closeError) {
      setNotice({ kind: 'error', text: getErrorMessage(closeError) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.toolbar}>
          <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          <Pressable
            accessibilityLabel="Actualizar arqueo"
            accessibilityRole="button"
            disabled={loading}
            onPress={() => { void loadShiftData(branchId); }}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
          >
            <RefreshCw color={colors.accent} size={15} />
            <Text style={styles.refreshText}>Actualizar</Text>
          </Pressable>
        </View>

        {branchLoading ? <StatusCard title="Cargando sucursales…" /> : null}
        {branchError ? <StatusCard title={branchError} tone="error" /> : null}
        {notice ? (
          <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.cajaCard}>
          <View style={[styles.cajaHeader, compact && styles.cajaHeaderCompact]}>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>
                {isOpen ? 'Turno Operativo Abierto' : displayShift ? 'Turno Cerrado y Auditado' : 'Sin Turno Abierto'}
              </Text>
              <Text style={styles.title}>Arqueo y Cierre de Caja</Text>
              <Text style={styles.branchLabel}>{selectedBranchName || 'Sucursal sin seleccionar'}</Text>
            </View>
            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>Estado:</Text>
              <Text style={[styles.statusValue, !isOpen && styles.statusValueClosed]}>{statusLabel}</Text>
            </View>
          </View>

          {openShifts.length > 1 ? (
            <View style={styles.shiftPickerRow}>
              <Text style={styles.shiftPickerLabel}>Turnos abiertos:</Text>
              {openShifts.map((shift) => {
                const active = String(shift.id_caja) === String(selectedOpenShift?.id_caja);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={String(shift.id_caja)}
                    onPress={() => {
                      setSelectedShiftId(String(shift.id_caja));
                      setDeclared('');
                    }}
                    style={[styles.shiftChip, active && styles.shiftChipActive]}
                  >
                    <Text style={[styles.shiftChipText, active && styles.shiftChipTextActive]}>
                      #{shift.id_caja} · {shift.nombre_usuario || `Operador ${shift.id_usuario}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : shiftLabel ? (
            <Text style={styles.shiftHint}>{shiftLabel}</Text>
          ) : null}

          {loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.statusText}>Cargando arqueo…</Text>
            </View>
          ) : error ? (
            <View style={styles.status}>
              <Text style={styles.errorTitle}>No se pudo cargar el arqueo</Text>
              <Text style={styles.statusText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => { void loadShiftData(branchId); }} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.breakdownGrid}>
                <MetricCard label="Monto Apertura (Base Inicial)" tone="neutral" value={`Bs. ${baseAmount.toFixed(2)}`} />
                <MetricCard label="Ingresos por Alquiler de Mesas" tone="warning" value={`Bs. ${rentalIncome.toFixed(2)}`} />
                <MetricCard label="Ingresos por Ventas POS" tone="info" value={`Bs. ${posIncome.toFixed(2)}`} />
                <MetricCard
                  accent
                  label="TOTAL ESPERADO EN CAJA"
                  tone="accent"
                  value={`Bs. ${expectedTotal.toFixed(2)}`}
                />
              </View>

              {displayShift ? (
                <View style={styles.declarationCard}>
                  <View style={styles.declarationRow}>
                    <View style={styles.declaredColumn}>
                      <Text style={styles.inputLabel}>Efectivo Físico Declarado (Bs.)</Text>
                      {isOpen ? (
                        <TextInput
                          accessibilityLabel="Efectivo físico declarado"
                          keyboardType="decimal-pad"
                          onChangeText={setDeclared}
                          placeholder="Ingrese monto contado en caja..."
                          placeholderTextColor={colors.textMuted}
                          style={styles.declaredInput}
                          value={declared}
                        />
                      ) : (
                        <View style={styles.declaredClosedBox}>
                          <Text style={styles.declaredClosedValue}>
                            Bs. {hasDeclared ? declaredValue.toFixed(2) : '0.00'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.resultCard}>
                      <Text style={styles.resultCaption}>Resultado del Cuadre</Text>
                      <Text style={[styles.resultAmount, resultTone]}>{resultAmount}</Text>
                      <Text style={[styles.resultHint, resultTone]}>{resultLabel}</Text>
                    </View>
                  </View>

                  {isOpen ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy !== null || !hasDeclared}
                        onPress={executeClose}
                        style={({ pressed }) => [
                          styles.closeButton,
                          pressed && styles.pressed,
                          (busy !== null || !hasDeclared) && styles.disabled,
                        ]}
                      >
                        {busy === 'close'
                          ? <ActivityIndicator color="#04130d" size="small" />
                          : (
                            <>
                              <Lock color="#04130d" size={16} />
                              <Text style={styles.closeButtonText}>Ejecutar Cierre de Turno</Text>
                            </>
                          )}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.emptyShift}>
                  <Banknote color={colors.textMuted} size={28} />
                  <Text style={styles.emptyShiftText}>
                    No hay un turno de caja abierto. Registra la base inicial para comenzar el arqueo.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {!isOpen && !loading ? (
          <View style={styles.openCard}>
            <View style={styles.openHeader}>
              <View style={styles.openHeaderCopy}>
                <Text style={styles.openTitle}>Abrir Turno de Caja</Text>
                <Text style={styles.openSubtitle}>
                  Registra el monto inicial del turno para habilitar el control de efectivo.
                </Text>
              </View>
            </View>

            <View style={[styles.openFields, compact && styles.openFieldsCompact]}>
              {isGlobalAdmin ? (
                <View style={styles.openField}>
                  <Text style={styles.inputLabel}>Operador</Text>
                  <OptionPicker
                    disabled={!operatorOptions.length}
                    label="Operador del turno"
                    onSelect={setOpenOperatorId}
                    options={operatorOptions}
                    placeholder={operatorOptions.length ? 'Seleccionar operador' : 'Sin operadores disponibles'}
                    value={openOperatorId}
                  />
                </View>
              ) : null}

              <View style={styles.openField}>
                <Text style={styles.inputLabel}>Monto Inicial / Base (Bs.)</Text>
                <TextInput
                  accessibilityLabel="Monto inicial del turno"
                  keyboardType="decimal-pad"
                  onChangeText={setOpenAmount}
                  placeholder="200"
                  placeholderTextColor={colors.textMuted}
                  style={styles.declaredInput}
                  value={openAmount}
                />
              </View>
            </View>

            {isGlobalAdmin && !operatorOptions.length ? (
              <Text style={styles.openWarning}>
                Todos los operadores de la sucursal ya tienen un turno abierto.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy !== null || !branchId || (isGlobalAdmin && !operatorOptions.length)}
              onPress={openShift}
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.pressed,
                (busy !== null || !branchId || (isGlobalAdmin && !operatorOptions.length)) && styles.disabled,
              ]}
            >
              {busy === 'open'
                ? <ActivityIndicator color="#04130d" size="small" />
                : <Text style={styles.openButtonText}>Abrir Turno</Text>}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  tone,
  accent = false,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'warning' | 'info' | 'accent';
  accent?: boolean;
}) {
  return (
    <View style={[styles.metricCard, accent && styles.metricCardAccent]}>
      <Text style={[styles.metricLabel, accent && styles.metricLabelAccent]}>{label}</Text>
      <Text style={[
        styles.metricValue,
        tone === 'warning' && styles.metricWarning,
        tone === 'info' && styles.metricInfo,
        tone === 'accent' && styles.metricAccent,
      ]}>
        {value}
      </Text>
    </View>
  );
}

function StatusCard({ title, tone = 'info' }: { title: string; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.statusCard, tone === 'error' && styles.statusCardError]}>
      <Text style={[styles.statusCardText, tone === 'error' && styles.statusCardTextError]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 900, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  refreshButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  notice: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700' },
  cajaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    ...shadows,
  },
  cajaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  cajaHeaderCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 3 },
  branchLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: { color: colors.textMuted, fontSize: 11 },
  statusValue: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  statusValueClosed: { color: colors.warning },
  shiftHint: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 12 },
  shiftPickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 },
  shiftPickerLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  shiftChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  shiftChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  shiftChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  shiftChipTextActive: { color: colors.accent },
  status: { alignItems: 'center', justifyContent: 'center', minHeight: 160, padding: 18, gap: 10 },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  statusText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 9, borderWidth: 1, borderColor: colors.accent },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginVertical: 20 },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 220,
    padding: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  metricCardAccent: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.45)' },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricLabelAccent: { color: '#6ee7b7', fontWeight: '800', textTransform: 'uppercase' },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 5 },
  metricWarning: { color: colors.warning },
  metricInfo: { color: colors.info },
  metricAccent: { color: colors.accent, fontSize: 24 },
  declarationCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  declarationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  declaredColumn: { flex: 1, minWidth: 240 },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  declaredInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontSize: 18,
    fontWeight: '700',
  },
  declaredClosedBox: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  declaredClosedValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  resultCard: {
    flex: 1,
    minWidth: 240,
    padding: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultCaption: { color: colors.textMuted, fontSize: 11 },
  resultAmount: { fontSize: 21, fontWeight: '800', marginTop: 5 },
  resultHint: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  resultMuted: { color: colors.textMuted },
  resultSuccess: { color: colors.accent },
  resultInfo: { color: colors.info },
  resultDanger: { color: colors.danger },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 2 },
  closeButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.warning,
  },
  closeButtonText: { color: '#04130d', fontSize: 13, fontWeight: '800' },
  emptyShift: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 26,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
  },
  emptyShiftText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  openCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    ...shadows,
  },
  openHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  openHeaderCopy: { flex: 1, minWidth: 0 },
  openTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  openSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  openFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  openFieldsCompact: { flexDirection: 'column' },
  openField: { flex: 1, minWidth: 220 },
  openWarning: { color: colors.warning, fontSize: 11, fontWeight: '700', marginTop: 12 },
  openButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 11,
    backgroundColor: colors.accent,
    marginTop: 16,
  },
  openButtonText: { color: '#04130d', fontSize: 13, fontWeight: '800' },
  statusCard: {
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statusCardError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusCardText: { color: colors.text, fontWeight: '700' },
  statusCardTextError: { color: colors.danger },
});
