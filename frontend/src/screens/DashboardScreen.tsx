import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  Beer,
  Clock,
  Eye,
  Pause,
  Play,
  PlusCircle,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Timer,
  TrendingUp,
  Vault,
  Wrench,
} from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import {
  getDashboardSummary,
  listBranchOperators,
  listDashboardBranches,
  type BranchOperator,
  type DashboardSummary,
} from '../services/dashboard';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import type { Branch } from '../services/products';
import {
  createSession,
  listTables,
  updateTable,
  type Table,
} from '../services/tables';
import { colors, shadows } from '../theme';

type Notice = { tone: 'success' | 'error' | 'info'; text: string };

type DashboardScreenProps = {
  user: AuthUser;
  initialBranchId?: string;
  onOpenPos: (tableId?: string) => void;
};

type DashboardSession = DashboardSummary['sessions'][number];

function money(value: number | string) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function time(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

function clock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'No se pudieron cargar los datos del dashboard.';
}

export default function DashboardScreen({ user, initialBranchId, onOpenPos }: DashboardScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState(
    initialBranchId || (user.rol === 'admin_general' ? '' : String(user.id_sucursal ?? '')),
  );
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clockTick, setClockTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [operators, setOperators] = useState<BranchOperator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const preserveNoticeOnNextLoad = useRef(false);
  useAccessibleModal(Boolean(pendingTable), () => setPendingTable(null));
  const canManageTables = user.rol !== 'cajero';

  useEffect(() => {
    let active = true;
    void listDashboardBranches()
      .then((result) => {
        if (!active) return;
        setBranches(result);
        setBranchId((current) => {
          if (initialBranchId && result.some((branch) => String(branch.id_sucursal) === initialBranchId)) {
            return initialBranchId;
          }
          if (current && result.some((branch) => String(branch.id_sucursal) === current)) return current;
          if (user.rol !== 'admin_general') return String(user.id_sucursal ?? '');
          return String(result[0]?.id_sucursal || '');
        });
        setNotice(result.length ? null : { tone: 'info', text: 'No hay sucursales disponibles para mostrar el dashboard.' });
      })
      .catch((error: unknown) => {
        if (active) setNotice({ tone: 'error', text: getErrorMessage(error) });
      })
      .finally(() => {
        if (active) setBranchLoading(false);
      });
    return () => { active = false; };
  }, [initialBranchId, user.id_sucursal, user.rol]);

  useEffect(() => {
    if (!branchId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const [result, tableList] = await Promise.all([
          getDashboardSummary(branchId),
          listTables(branchId),
        ]);
        if (!active) return;
        setSummary(result);
        setTables(tableList);
        setLastUpdated(new Date());
        if (preserveNoticeOnNextLoad.current) preserveNoticeOnNextLoad.current = false;
        else setNotice(null);
      } catch (error) {
        if (active) {
          preserveNoticeOnNextLoad.current = false;
          setNotice({ tone: 'error', text: getErrorMessage(error) });
          setSummary(null);
          setTables([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    setSummary(null);
    setTables([]);
    void load();
    const interval = setInterval(() => { void load(); }, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [branchId, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => setClockTick((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === branchId);
  const sessionByTable = new Map(
    (summary?.sessions || []).map((session) => [String(session.id_mesa), session]),
  );

  const sessionElapsed = (session: DashboardSession) => {
    const extraSeconds = session.estado === 'activa' && lastUpdated
      ? Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
      : 0;
    return Number(session.segundos_transcurridos) + extraSeconds;
  };

  const sessionRental = (session: DashboardSession) => {
    const minutes = Math.max(1, Math.ceil(sessionElapsed(session) / 60));
    return Number((minutes * Number(session.tarifa_minuto || 0)).toFixed(2));
  };

  const beginSession = async (table: Table, operatorId: number) => {
    if (!Number.isSafeInteger(operatorId) || operatorId <= 0) {
      setNotice({ tone: 'error', text: 'No se encontró un operador válido para iniciar la sesión.' });
      return;
    }
    setBusyId(`table:${table.id_mesa}`);
    setNotice(null);
    try {
      await createSession({ id_mesa: Number(table.id_mesa), id_usuario: operatorId });
      setPendingTable(null);
      setNotice({ tone: 'success', text: `Cronómetro iniciado en la mesa ${table.numero_mesa}.` });
      preserveNoticeOnNextLoad.current = true;
      setRefreshKey((current) => current + 1);
    } catch (error) {
      if (user.rol === 'admin_general' && error instanceof ApiError && error.code === 'INVALID_BRANCH_OPERATOR') {
        setSelectedOperatorId('');
        setOperatorError('El operador ya no está activo o fue reasignado. Actualizando operadores activos de la sucursal…');
        setOperatorsLoading(true);
        try {
          const activeOperators = await listBranchOperators(branchId);
          setOperators(activeOperators);
          setSelectedOperatorId(String(activeOperators[0]?.id_usuario || ''));
          setOperatorError(activeOperators.length
            ? 'La lista se actualizó. Selecciona un operador activo de esta sucursal e inténtalo de nuevo.'
            : 'La sucursal no tiene usuarios activos asignados para operar mesas.');
        } catch (refreshError) {
          setOperatorError(`${getErrorMessage(error)} No se pudo actualizar la lista: ${getErrorMessage(refreshError)}`);
        } finally {
          setOperatorsLoading(false);
        }
      } else {
        setNotice({ tone: 'error', text: getErrorMessage(error) });
      }
    } finally {
      setBusyId(null);
    }
  };

  const startTableSession = async (table: Table) => {
    if (user.rol !== 'admin_general') {
      await beginSession(table, Number(user.id_usuario));
      return;
    }
    setPendingTable(table);
    setOperators([]);
    setSelectedOperatorId('');
    setOperatorError(null);
    setOperatorsLoading(true);
    try {
      const activeOperators = await listBranchOperators(branchId);
      setOperators(activeOperators);
      setSelectedOperatorId(String(activeOperators[0]?.id_usuario || ''));
      if (!activeOperators.length) setOperatorError('La sucursal no tiene usuarios activos asignados para operar mesas.');
    } catch (error) {
      setOperatorError(getErrorMessage(error));
    } finally {
      setOperatorsLoading(false);
    }
  };

  const toggleMaintenance = async (table: Table) => {
    if (!canManageTables || table.estado === 'ocupada') return;
    setBusyId(`table:${table.id_mesa}`);
    setNotice(null);
    try {
      await updateTable(table.id_mesa, {
        numero_mesa: table.numero_mesa,
        tipo_mesa: table.tipo_mesa,
        tarifa_minuto: Number(table.tarifa_minuto),
        id_sucursal: Number(table.id_sucursal),
        estado: table.estado === 'mantenimiento' ? 'libre' : 'mantenimiento',
      });
      setNotice({
        tone: 'success',
        text: table.estado === 'mantenimiento'
          ? `Mesa ${table.numero_mesa} volvió a estar disponible.`
          : `Mesa ${table.numero_mesa} pasó a mantenimiento.`,
      });
      preserveNoticeOnNextLoad.current = true;
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  void clockTick;

  const totalIncome = Number(summary?.income?.total || 0);
  const posIncome = Number(summary?.income?.productos || 0);
  const rentalIncome = Number(summary?.income?.alquileres || 0);
  const expectedCash = Number(summary?.cash?.efectivo_esperado || 0);
  const cashBase = Number(summary?.cash?.base_abierta || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>OPERACIÓN · EN VIVO</Text>
            <Text style={styles.title}>Dashboard de mesas</Text>
            <Text style={styles.subtitle}>
              Estado de las mesas, cronómetros y cuentas abiertas de la sucursal, actualizado automáticamente cada 30 segundos.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Actualizar dashboard"
              disabled={loading || !branchId}
              onPress={refresh}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, (loading || !branchId) && styles.disabled]}
            >
              <RefreshCw color={colors.accent} size={17} />
              <Text style={styles.refreshText}>{loading ? 'Actualizando…' : 'Actualizar'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
          {user.rol === 'admin_general' ? (
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          ) : (
            <View style={styles.branchLabel}>
              <Text style={styles.branchCaption}>SUCURSAL</Text>
              <Text style={styles.branchName}>{selectedBranch?.nombre || 'Sucursal asignada'}</Text>
            </View>
          )}
          <Text style={styles.updatedAt}>
            {lastUpdated
              ? `Actualizado ${lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Esperando datos'}
          </Text>
        </View>

        {branchLoading ? <StatusBox text="Cargando sucursales…" /> : null}
        {notice ? <StatusBox text={notice.text} tone={notice.tone} /> : null}
        {loading && !summary ? <StatusBox text="Cargando datos operativos…" /> : null}

        {summary ? (
          <>
            <View style={[styles.metricsGrid, compact && styles.metricsGridCompact]}>
              <MetricCard
                detail="Mesas + Ventas POS"
                icon={<Banknote color={colors.accent} size={23} />}
                label="Ingresos Totales Turno"
                tone="green"
                value={money(totalIncome)}
              />
              <MetricCard
                detail={`${summary.tables.mesas_libres} mesas disponibles ahora`}
                icon={<Timer color={colors.warning} size={23} />}
                label="Mesas Activas"
                tone="amber"
                value={`${summary.tables.mesas_ocupadas} / ${summary.tables.mesas_total}`}
              />
              <MetricCard
                detail="Bebidas, snacks y accesorios"
                icon={<Beer color={colors.info} size={23} />}
                label="Ventas POS Turno"
                tone="sky"
                value={money(posIncome)}
              />
              <MetricCard
                detail={`Incluye base inicial (${money(cashBase)})`}
                icon={<Vault color="#c084fc" size={23} />}
                label="Efectivo Esperado Caja"
                tone="purple"
                value={money(expectedCash)}
              />
            </View>

            <View style={[styles.legendBar, compact && styles.legendBarCompact]}>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotFree]} />
                  <Text style={styles.legendTextFree}>Libre (Disponible)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotBusy]} />
                  <Text style={styles.legendTextBusy}>Ocupada (Cronómetro Activo)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotMaint]} />
                  <Text style={styles.legendTextMaint}>Mantenimiento</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir venta directa POS"
                onPress={() => onOpenPos()}
                style={({ pressed }) => [styles.posButton, pressed && styles.pressed]}
              >
                <ShoppingCart color={colors.text} size={15} />
                <Text style={styles.posButtonText}>Venta Directa POS</Text>
              </Pressable>
            </View>

            {rentalIncome > 0 ? (
              <Text style={styles.rentalHint}>Alquiler de mesas cobrado hoy: {money(rentalIncome)}</Text>
            ) : null}

            {tables.length ? (
              <View style={styles.tableGrid}>
                {tables.map((table) => {
                  const session = sessionByTable.get(String(table.id_mesa));
                  const isMaintenance = table.estado === 'mantenimiento';
                  const isOccupied = Boolean(session) || table.estado === 'ocupada';
                  const isPaused = session?.estado === 'pausada';
                  const isBusy = busyId === `table:${table.id_mesa}`;
                  const elapsedSeconds = session ? sessionElapsed(session) : 0;
                  const rentalCost = session ? sessionRental(session) : 0;
                  const posCost = Number(session?.consumo_pos || 0);
                  const currentTotal = Number((rentalCost + posCost).toFixed(2));

                  return (
                    <View
                      key={String(table.id_mesa)}
                      style={[
                        styles.tableCard,
                        isMaintenance ? styles.tableCardMaint
                          : isOccupied ? styles.tableCardBusy
                            : styles.tableCardFree,
                      ]}
                    >
                      <View>
                        <View style={styles.tableHeading}>
                          <View style={styles.tableTitleGroup}>
                            <Text style={styles.tableName}>Mesa {table.numero_mesa}</Text>
                            <Text style={styles.tableMeta}>{table.tipo_mesa}</Text>
                          </View>
                          <View style={styles.tableBadgeRow}>
                            {canManageTables && !isOccupied ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={isMaintenance ? 'Habilitar mesa' : 'Enviar mesa a mantenimiento'}
                                disabled={isBusy}
                                onPress={() => { void toggleMaintenance(table); }}
                                style={({ pressed }) => [styles.maintIconButton, pressed && styles.pressed, isBusy && styles.disabled]}
                              >
                                <Wrench color={isMaintenance ? colors.accent : colors.textMuted} size={13} />
                              </Pressable>
                            ) : null}
                            <TableBadge isMaintenance={isMaintenance} isOccupied={isOccupied} isPaused={isPaused} />
                          </View>
                        </View>

                        <View style={styles.tariffPill}>
                          <Clock color={colors.accent} size={13} />
                          <Text style={styles.tariffText}>
                            Tarifa: <Text style={styles.tariffStrong}>{money(table.tarifa_minuto)}</Text> / min
                          </Text>
                        </View>

                        <View style={styles.timerBox}>
                          <View style={styles.timerSide}>
                            <Text style={styles.timerCaption}>Tiempo Transcurrido</Text>
                            <Text style={[styles.timerValue, isOccupied ? styles.timerValueBusy : styles.timerValueIdle]}>
                              {clock(elapsedSeconds)}
                            </Text>
                          </View>
                          <View style={[styles.timerSide, styles.timerSideRight]}>
                            <Text style={styles.timerCaption}>Cuenta Actual</Text>
                            <Text style={[styles.totalValue, isOccupied ? styles.totalValueBusy : styles.totalValueIdle]}>
                              {money(currentTotal)}
                            </Text>
                            {posCost > 0 ? (
                              <Text style={styles.posExtra}>+{money(posCost)} POS</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        {isMaintenance ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={isBusy}
                            onPress={() => { void toggleMaintenance(table); }}
                            style={({ pressed }) => [styles.cardAction, styles.actionNeutral, pressed && styles.pressed, isBusy && styles.disabled]}
                          >
                            {isBusy
                              ? <ActivityIndicator color={colors.textMuted} size="small" />
                              : <Wrench color={colors.text} size={14} />}
                            <Text style={styles.actionText}>Habilitar Mesa</Text>
                          </Pressable>
                        ) : isOccupied ? (
                          <>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Agregar consumo POS a la mesa ${table.numero_mesa}`}
                              onPress={() => onOpenPos(String(table.id_mesa))}
                              style={({ pressed }) => [styles.cardAction, styles.actionSky, pressed && styles.pressed]}
                            >
                              <PlusCircle color={colors.text} size={14} />
                              <Text style={styles.actionText}>Consumo POS</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Ver o cobrar la mesa ${table.numero_mesa}`}
                              onPress={() => onOpenPos(String(table.id_mesa))}
                              style={({ pressed }) => [styles.cardAction, styles.actionAmber, pressed && styles.pressed]}
                            >
                              <Receipt color={colors.text} size={14} />
                              <Text style={styles.actionText}>Ver / Cobrar</Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              accessibilityRole="button"
                              disabled={isBusy}
                              onPress={() => { void startTableSession(table); }}
                              style={({ pressed }) => [styles.cardAction, styles.actionPrimary, pressed && styles.pressed, isBusy && styles.disabled]}
                            >
                              {isBusy
                                ? <ActivityIndicator color={colors.text} size="small" />
                                : <Play color={colors.text} size={14} />}
                              <Text style={styles.actionText}>Iniciar Tiempo</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Abrir POS en la mesa ${table.numero_mesa}`}
                              onPress={() => onOpenPos(String(table.id_mesa))}
                              style={({ pressed }) => [styles.cardAction, styles.actionNeutral, pressed && styles.pressed]}
                            >
                              <Eye color={colors.text} size={14} />
                              <Text style={styles.actionText}>Abrir POS</Text>
                            </Pressable>
                          </>
                        )}
                      </View>

                      {session ? (
                        <Text style={styles.sessionFooter}>
                          {isPaused ? 'Pausada' : 'En juego'} · {session.nombre_usuario} · desde {time(session.hora_inicio)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : <EmptyState text="Esta sucursal todavía no tiene mesas registradas." />}
          </>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pendingTable)}
        onRequestClose={() => setPendingTable(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar diálogo"
          style={styles.modalBackdrop}
          onPress={() => setPendingTable(null)}
        >
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            {pendingTable ? (
              <>
                <Text style={styles.modalTitle}>Iniciar sesión · Mesa {pendingTable.numero_mesa}</Text>
                <Text style={styles.modalDescription}>Selecciona un operador activo de la sucursal actual para atender esta mesa.</Text>
                {operatorsLoading ? <ActivityIndicator color={colors.accent} /> : null}
                {operatorError ? <Text accessibilityRole="alert" style={styles.modalError}>{operatorError}</Text> : null}
                <ScrollView style={styles.operatorList}>
                  {operators.map((operator) => {
                    const selected = String(operator.id_usuario) === selectedOperatorId;
                    return (
                      <Pressable
                        key={String(operator.id_usuario)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedOperatorId(String(operator.id_usuario))}
                        style={[styles.operatorOption, selected && styles.operatorOptionSelected]}
                      >
                        <View>
                          <Text style={[styles.operatorName, selected && styles.operatorNameSelected]}>{operator.nombre}</Text>
                          <Text style={styles.operatorRole}>{operator.rol === 'cajero' ? 'Cajero' : 'Administrador de sucursal'}</Text>
                        </View>
                        {selected ? <Text style={styles.operatorCheck}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={operatorsLoading || !selectedOperatorId || busyId === `table:${pendingTable.id_mesa}`}
                    onPress={() => {
                      const operatorId = Number(selectedOperatorId);
                      if (Number.isSafeInteger(operatorId) && operatorId > 0) void beginSession(pendingTable, operatorId);
                    }}
                    style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed, (!selectedOperatorId || operatorsLoading) && styles.disabled]}
                  >
                    {busyId === `table:${pendingTable.id_mesa}`
                      ? <ActivityIndicator color={colors.text} size="small" />
                      : <Text style={styles.modalPrimaryText}>Iniciar sesión</Text>}
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setPendingTable(null)} style={styles.modalCancel}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'amber' | 'sky' | 'purple';
  icon: ReactNode;
}) {
  const tint = tone === 'green' ? styles.kpiGreen
    : tone === 'amber' ? styles.kpiAmber
      : tone === 'sky' ? styles.kpiSky
        : styles.kpiPurple;
  const valueTone = tone === 'green' ? styles.kpiValueGreen
    : tone === 'amber' ? styles.kpiValueAmber
      : tone === 'sky' ? styles.kpiValueSky
        : styles.kpiValuePurple;
  return (
    <View style={[styles.metricCard, tint]}>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, valueTone]}>{value}</Text>
        <View style={styles.metricDetailRow}>
          {tone === 'green' ? <TrendingUp color={colors.accent} size={12} /> : null}
          <Text style={[styles.metricDetail, tone === 'green' && styles.metricDetailGreen]}>{detail}</Text>
        </View>
      </View>
      <View style={[styles.metricIcon, tint]}>{icon}</View>
    </View>
  );
}

function StatusBox({ text, tone = 'info' }: { text: string; tone?: Notice['tone'] }) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'none'}
      style={[
        styles.statusBox,
        tone === 'error' && styles.statusError,
        tone === 'success' && styles.statusSuccess,
      ]}
    >
      {tone === 'info' ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {tone === 'success' ? <Text style={styles.statusSuccessIcon}>✓</Text> : null}
      <Text style={[
        styles.statusText,
        tone === 'error' && styles.statusTextError,
        tone === 'success' && styles.statusTextSuccess,
      ]}>{text}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function TableBadge({
  isOccupied,
  isPaused,
  isMaintenance,
}: {
  isOccupied: boolean;
  isPaused: boolean;
  isMaintenance: boolean;
}) {
  if (isMaintenance) {
    return (
      <View style={[styles.tableBadge, styles.tableBadgeMaint]}>
        <Text style={[styles.tableBadgeText, styles.tableBadgeTextMaint]}>MANTENIMIENTO</Text>
      </View>
    );
  }
  if (isOccupied) {
    return (
      <View style={[styles.tableBadge, styles.tableBadgeBusy]}>
        <View style={styles.badgePulse} />
        <Text style={[styles.tableBadgeText, styles.tableBadgeTextBusy]}>{isPaused ? 'PAUSADA' : 'EN JUEGO'}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.tableBadge, styles.tableBadgeFree]}>
      <Text style={[styles.tableBadgeText, styles.tableBadgeTextFree]}>LIBRE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', padding: 24, gap: 16 },
  contentCompact: { padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 760 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  refreshButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
  },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingVertical: 2 },
  toolbarCompact: { alignItems: 'flex-start' },
  branchLabel: {
    minWidth: 210,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  branchCaption: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  branchName: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  updatedAt: { color: colors.textMuted, fontSize: 11 },
  statusBox: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusError: { borderColor: 'rgba(251, 113, 133, 0.45)', backgroundColor: colors.dangerSoft },
  statusSuccess: { borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: colors.accentSoft },
  statusText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  statusTextError: { color: colors.danger },
  statusTextSuccess: { color: colors.accent },
  statusSuccessIcon: { color: colors.accent, fontSize: 15, fontWeight: '900' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricsGridCompact: { gap: 10 },
  metricCard: {
    flex: 1,
    flexBasis: 260,
    minWidth: 220,
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows,
  },
  metricCopy: { flex: 1, minWidth: 0 },
  metricLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  metricValue: { fontSize: 24, fontWeight: '900', marginTop: 7 },
  metricDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  metricDetail: { color: colors.textMuted, fontSize: 10, flexShrink: 1 },
  metricDetailGreen: { color: colors.accent },
  metricIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kpiGreen: { backgroundColor: 'rgba(6, 32, 24, 0.55)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  kpiAmber: { backgroundColor: 'rgba(40, 27, 6, 0.55)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  kpiSky: { backgroundColor: 'rgba(6, 27, 42, 0.55)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  kpiPurple: { backgroundColor: 'rgba(30, 17, 45, 0.55)', borderColor: 'rgba(168, 85, 247, 0.3)' },
  kpiValueGreen: { color: colors.text },
  kpiValueAmber: { color: colors.warning },
  kpiValueSky: { color: colors.info },
  kpiValuePurple: { color: '#c084fc' },
  legendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  legendBarCompact: { alignItems: 'flex-start' },
  legendItems: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 11, height: 11, borderRadius: 6 },
  legendDotFree: { backgroundColor: colors.accent },
  legendDotBusy: { backgroundColor: colors.warning },
  legendDotMaint: { backgroundColor: '#475569' },
  legendTextFree: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  legendTextBusy: { color: colors.warning, fontSize: 11, fontWeight: '600' },
  legendTextMaint: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  posButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 11,
    paddingHorizontal: 14,
    backgroundColor: '#0284c7',
  },
  posButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  rentalHint: { color: colors.textMuted, fontSize: 11 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tableCard: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 280,
    maxWidth: 480,
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    ...shadows,
  },
  tableCardFree: { backgroundColor: '#0a1f18', borderColor: 'rgba(16, 185, 129, 0.35)' },
  tableCardBusy: { backgroundColor: '#241a09', borderColor: 'rgba(245, 158, 11, 0.55)' },
  tableCardMaint: { backgroundColor: '#0d1424', borderColor: 'rgba(71, 85, 105, 0.7)', opacity: 0.85 },
  tableHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  tableTitleGroup: { flex: 1, minWidth: 0 },
  tableName: { color: colors.text, fontSize: 18, fontWeight: '900' },
  tableMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  tableBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maintIconButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  tableBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  tableBadgeFree: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  tableBadgeBusy: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)' },
  tableBadgeMaint: { backgroundColor: '#1e293b', borderColor: '#334155' },
  tableBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  tableBadgeTextFree: { color: colors.accent },
  tableBadgeTextBusy: { color: '#fcd34d' },
  tableBadgeTextMaint: { color: colors.textMuted },
  badgePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  tariffPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  tariffText: { color: colors.textMuted, fontSize: 10 },
  tariffStrong: { color: colors.text, fontWeight: '800' },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 14,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
  },
  timerSide: { flex: 1, minWidth: 0 },
  timerSideRight: { alignItems: 'flex-end' },
  timerCaption: { color: '#64748b', fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  timerValue: { fontFamily: 'monospace', fontVariant: ['tabular-nums'], fontSize: 22, fontWeight: '900', marginTop: 3 },
  timerValueBusy: { color: colors.warning },
  timerValueIdle: { color: '#475569' },
  totalValue: { fontFamily: 'monospace', fontVariant: ['tabular-nums'], fontSize: 17, fontWeight: '900', marginTop: 3 },
  totalValueBusy: { color: colors.accent },
  totalValueIdle: { color: '#475569' },
  posExtra: { color: colors.info, fontSize: 9, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 9, paddingTop: 2 },
  cardAction: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    paddingHorizontal: 8,
  },
  actionPrimary: { backgroundColor: '#059669' },
  actionSky: { backgroundColor: '#0284c7' },
  actionAmber: { backgroundColor: '#d97706' },
  actionNeutral: { backgroundColor: '#1e293b' },
  actionText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  sessionFooter: { color: colors.textMuted, fontSize: 9, marginTop: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(2, 6, 23, 0.78)' },
  modalCard: { width: '100%', maxWidth: 480, maxHeight: '85%', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  modalDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 14 },
  modalError: { color: colors.danger, fontSize: 11, lineHeight: 17, marginBottom: 10 },
  operatorList: { flexGrow: 0, maxHeight: 280 },
  operatorOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  operatorOptionSelected: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.35)' },
  operatorName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  operatorNameSelected: { color: colors.accent },
  operatorRole: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  operatorCheck: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 9, marginTop: 16 },
  modalPrimary: { minHeight: 40, minWidth: 130, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  modalPrimaryText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  modalCancel: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 19, textAlign: 'center', paddingVertical: 26 },
});
