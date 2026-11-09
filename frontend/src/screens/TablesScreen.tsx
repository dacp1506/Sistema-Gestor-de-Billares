import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { BranchPicker } from '../components/BranchPicker';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import {
  createSession,
  createTable,
  finishSession,
  listActiveSessions,
  listBranches,
  listSessions,
  listTables,
  pauseSession,
  resumeSession,
  type Table,
  type TableInput,
  type TableSession,
} from '../services/tables';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

const defaultTableForm = {
  numero_mesa: '',
  tipo_mesa: 'Pool',
  tarifa_minuto: '30',
  estado: 'libre' as 'libre' | 'mantenimiento',
};

export default function TablesScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const canManageTables = user.rol !== 'cajero';
  const [branches, setBranches] = useState<Array<{ id_sucursal: number | string; nombre: string; estado: boolean }>>([]);
  const [branchId, setBranchId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sessioningTableId, setSessioningTableId] = useState<number | string | null>(null);
  const [sessionActionId, setSessionActionId] = useState<number | string | null>(null);
  const [tableForm, setTableForm] = useState(defaultTableForm);

  const fetchBranches = useCallback(async () => {
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

  const fetchTables = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setTables([]);
      setSessions([]);
      setListError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError(null);
    try {
      const [tableList, sessionList] = await Promise.all([
        listTables(selectedBranchId),
        listActiveSessions(selectedBranchId),
      ]);
      setTables(tableList);
      setSessions(sessionList);
    } catch (error) {
      setTables([]);
      setSessions([]);
      setListError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    void fetchTables(branchId);
  }, [branchId, fetchTables]);

  const summary = useMemo(() => {
    const active = sessions.filter((session) => session.estado === 'activa' || session.estado === 'pausada').length;
    return {
      libres: tables.filter((table) => table.estado === 'libre').length,
      ocupadas: tables.filter((table) => table.estado === 'ocupada').length,
      activas: active,
    };
  }, [sessions, tables]);

  const openCreateTable = () => {
    setFormError(null);
    setTableForm({ ...defaultTableForm });
    setFormVisible(true);
  };

  const createTableRecord = async () => {
    if (!branchId) return;
    const numero = tableForm.numero_mesa.trim();
    const tipo = tableForm.tipo_mesa.trim();
    const tarifa = Number(tableForm.tarifa_minuto);
    if (!numero || !tipo || !Number.isFinite(tarifa) || tarifa <= 0) {
      setFormError('Ingresa número, tipo y tarifa válidos para la mesa.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createTable({
        numero_mesa: numero,
        tipo_mesa: tipo,
        tarifa_minuto: tarifa,
        id_sucursal: Number(branchId),
        estado: tableForm.estado,
      });
      setNotice({ kind: 'success', text: 'Mesa registrada correctamente.' });
      setFormVisible(false);
      await fetchTables(branchId);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const startSessionForTable = async (table: Table) => {
    const parsedUser = Number(user.id_usuario);
    if (!Number.isInteger(parsedUser) || parsedUser <= 0) {
      setNotice({ kind: 'error', text: 'Ingresa un id_usuario válido para iniciar la sesión.' });
      return;
    }

    setSessioningTableId(table.id_mesa);
    setNotice(null);
    try {
      await createSession({ id_mesa: Number(table.id_mesa), id_usuario: parsedUser });
      setNotice({ kind: 'success', text: `Sesión iniciada para la mesa ${table.numero_mesa}.` });
      await fetchTables(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSessioningTableId(null);
    }
  };

  const runSessionAction = async (session: TableSession, action: 'pause' | 'resume' | 'finish') => {
    setSessionActionId(session.id_sesion);
    setNotice(null);
    try {
      if (action === 'pause') {
        await pauseSession(session.id_sesion);
        setNotice({ kind: 'success', text: `La sesión de la mesa ${session.numero_mesa} quedó pausada.` });
      }
      if (action === 'resume') {
        await resumeSession(session.id_sesion);
        setNotice({ kind: 'success', text: `La sesión de la mesa ${session.numero_mesa} se reanudó.` });
      }
      if (action === 'finish') {
        await finishSession(session.id_sesion);
        setNotice({ kind: 'success', text: `La sesión de la mesa ${session.numero_mesa} finalizó.` });
      }
      await fetchTables(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSessionActionId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>OPERACIÓN · MESAS</Text>
              <Text style={styles.pageTitle}>Mesas y sesiones</Text>
              <Text style={styles.subtitle}>Control de mesas por sucursal y gestión de sesiones de juego.</Text>
            </View>
            {canManageTables ? (
              <Pressable
                accessibilityRole="button"
                disabled={!branchId}
                onPress={openCreateTable}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !branchId && styles.disabledButton]}
              >
                <Text style={styles.primaryText}>＋ Nueva mesa</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
            <View style={styles.userField}>
              <Text style={styles.label}>OPERADOR</Text>
              <Text style={styles.input}>{user.nombre}</Text>
            </View>
          </View>

          {branchesLoading ? (
            <StatusCard title="Cargando sucursales…" />
          ) : branchError ? (
            <StatusCard title={branchError} tone="error" />
          ) : null}

          <View style={styles.summaryGrid}>
            <MetricCard label="Mesas libres" value={String(summary.libres)} accent />
            <MetricCard label="Mesas ocupadas" value={String(summary.ocupadas)} />
            <MetricCard label="Sesiones activas" value={String(summary.activas)} />
          </View>

          {notice ? (
            <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
              <Text style={styles.noticeText}>{notice.text}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loaderText}>Cargando mesas y sesiones…</Text>
            </View>
          ) : listError ? (
            <StatusCard title={listError} tone="error" />
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Mesas</Text>
            <Text style={styles.sectionMeta}>{tables.length} registradas</Text>
          </View>

          {!tables.length && !loading ? (
            <Text style={styles.emptyText}>No hay mesas en esta sucursal aún.</Text>
          ) : (
            tables.map((table) => (
              <View key={String(table.id_mesa)} style={styles.tableCard}>
                <View style={styles.tableTopRow}>
                  <View>
                    <Text style={styles.tableNumber}>Mesa {table.numero_mesa}</Text>
                    <Text style={styles.tableMeta}>{table.tipo_mesa} · ${Number(table.tarifa_minuto).toFixed(2)}/min</Text>
                  </View>
                  <View style={[styles.badge, table.estado === 'libre' ? styles.badgeFree : table.estado === 'ocupada' ? styles.badgeBusy : styles.badgeMaintenance]}>
                    <Text style={styles.badgeText}>{statusLabel(table.estado)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={table.estado !== 'libre' || !branchId || sessioningTableId === table.id_mesa}
                    onPress={() => startSessionForTable(table)}
                    style={({ pressed }) => [styles.actionButton, styles.primaryAction, (table.estado !== 'libre' || sessioningTableId === table.id_mesa) && styles.disabledButton, pressed && styles.pressed]}
                  >
                    {sessioningTableId === table.id_mesa ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Abrir sesión</Text>}
                  </Pressable>
                  <Text style={styles.tableStateText}>{table.estado === 'libre' ? 'Lista para uso' : 'No disponible para inicio'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Sesiones activas</Text>
            <Text style={styles.sectionMeta}>{sessions.length} abiertas</Text>
          </View>

          {!sessions.length ? (
            <Text style={styles.emptyText}>No hay sesiones activas o pausadas en esta sucursal.</Text>
          ) : (
            sessions.map((session) => (
              <View key={String(session.id_sesion)} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View>
                    <Text style={styles.sessionTitle}>Mesa {session.numero_mesa}</Text>
                    <Text style={styles.sessionMeta}>Usuario {session.id_usuario} · ${Number(session.tarifa_minuto).toFixed(2)}/min</Text>
                  </View>
                  <View style={[styles.badge, session.estado === 'activa' ? styles.badgeFree : session.estado === 'pausada' ? styles.badgeMaintenance : styles.badgeBusy]}>
                    <Text style={styles.badgeText}>{sessionStateLabel(session.estado)}</Text>
                  </View>
                </View>

                <View style={styles.sessionActions}>
                  {session.estado === 'activa' ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={sessionActionId === session.id_sesion}
                      onPress={() => runSessionAction(session, 'pause')}
                      style={({ pressed }) => [styles.actionButton, styles.warningAction, sessionActionId === session.id_sesion && styles.disabledButton, pressed && styles.pressed]}
                    >
                      {sessionActionId === session.id_sesion ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Pausar</Text>}
                    </Pressable>
                  ) : null}

                  {session.estado === 'pausada' ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={sessionActionId === session.id_sesion}
                      onPress={() => runSessionAction(session, 'resume')}
                      style={({ pressed }) => [styles.actionButton, styles.successAction, sessionActionId === session.id_sesion && styles.disabledButton, pressed && styles.pressed]}
                    >
                      {sessionActionId === session.id_sesion ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Reanudar</Text>}
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={sessionActionId === session.id_sesion}
                    onPress={() => runSessionAction(session, 'finish')}
                    style={({ pressed }) => [styles.actionButton, styles.dangerAction, sessionActionId === session.id_sesion && styles.disabledButton, pressed && styles.pressed]}
                  >
                    {sessionActionId === session.id_sesion ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Finalizar</Text>}
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent visible={formVisible} onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Registrar mesa</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Número</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={(value) => setTableForm((current) => ({ ...current, numero_mesa: value }))}
                placeholder="Ej. 1"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={tableForm.numero_mesa}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tipo</Text>
              <TextInput
                onChangeText={(value) => setTableForm((current) => ({ ...current, tipo_mesa: value }))}
                placeholder="Pool"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={tableForm.tipo_mesa}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tarifa por minuto</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => setTableForm((current) => ({ ...current, tarifa_minuto: value }))}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={tableForm.tarifa_minuto}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Estado inicial</Text>
              <View style={styles.segmentRow}>
                {(['libre', 'mantenimiento'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setTableForm((current) => ({ ...current, estado: option }))}
                    style={[styles.segmentOption, tableForm.estado === option && styles.segmentOptionActive]}
                  >
                    <Text style={[styles.segmentText, tableForm.estado === option && styles.segmentTextActive]}>{option === 'libre' ? 'Libre' : 'Mantenimiento'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {formError ? <Text style={styles.inlineError}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setFormVisible(false)} style={[styles.actionButton, styles.secondaryAction]}>
                <Text style={styles.actionText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={createTableRecord} style={[styles.actionButton, styles.primaryAction]} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Guardar</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado en la operación.';
}

function statusLabel(value: Table['estado']) {
  return value === 'libre' ? 'Libre' : value === 'ocupada' ? 'Ocupada' : 'Mantenimiento';
}

function sessionStateLabel(value: TableSession['estado']) {
  return value === 'activa' ? 'Activa' : value === 'pausada' ? 'Pausada' : 'Finalizada';
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
  contentCompact: { padding: 12 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  titleWrap: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.textMuted, marginTop: 6, fontSize: 14 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: 'center',
  },
  primaryText: { color: '#04130d', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.86 },
  disabledButton: { opacity: 0.5 },
  toolbar: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  toolbarCompact: { flexDirection: 'column', alignItems: 'stretch' },
  userField: { minWidth: 140, flex: 1 },
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
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  loaderWrap: { marginTop: 16, alignItems: 'center', paddingVertical: 14 },
  loaderText: { color: colors.textMuted, marginTop: 8 },
  notice: { marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700' },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sectionMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  tableCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  tableTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableNumber: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tableMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeFree: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  badgeBusy: { backgroundColor: 'rgba(251, 113, 133, 0.12)' },
  badgeMaintenance: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  actionButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryAction: { backgroundColor: colors.accent },
  secondaryAction: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  successAction: { backgroundColor: colors.accent },
  warningAction: { backgroundColor: colors.warning },
  dangerAction: { backgroundColor: colors.danger },
  actionText: { color: '#08110a', fontWeight: '800', fontSize: 13 },
  tableStateText: { color: colors.textMuted, flex: 1, textAlign: 'right', fontSize: 12 },
  statusCard: { marginTop: 12, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statusCardError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusText: { color: colors.text, fontWeight: '700' },
  statusTextError: { color: '#ffd4dc' },
  sessionCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sessionMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  sessionActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.82)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  inlineError: { color: '#ffd4dc', marginTop: 6, fontWeight: '700' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentOption: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  segmentOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  segmentText: { color: colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: colors.accent },
});
