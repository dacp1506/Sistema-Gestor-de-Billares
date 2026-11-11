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
import { CalendarClock, Play, Trash2 } from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { OptionPicker } from '../components/OptionPicker';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import {
  createReservation,
  listReservations,
  updateReservationStatus,
  type Reservation,
  type ReservationInput,
} from '../services/reservations';
import { createSession, listTables, type Table } from '../services/tables';
import { listUsers, type User } from '../services/users';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string };

type ReservationForm = {
  nombre_cliente: string;
  telefono_cliente: string;
  id_mesa: string;
  hora_inicio: string;
  duracion_horas: string;
};

const DURATION_OPTIONS = [
  { value: '1', label: '1 Hora' },
  { value: '2', label: '2 Horas' },
  { value: '3', label: '3 Horas' },
];

const initialForm = (): ReservationForm => ({
  nombre_cliente: '',
  telefono_cliente: '',
  id_mesa: '',
  hora_inicio: '20:00',
  duracion_horas: '2',
});

function localDateISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function durationLabel(minutes: number) {
  const hours = Math.round((Number(minutes) / 60) * 10) / 10;
  return `${hours}h`;
}

export default function ReservationsScreen({
  user,
  onOpenPos,
}: {
  user: AuthUser;
  onOpenPos?: (tableId?: string) => void;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < 1024;
  const today = localDateISO();
  const isGlobalAdmin = user.rol === 'admin_general';

  const [branches, setBranches] = useState<Array<{ id_sucursal: number | string; nombre: string; estado: boolean }>>([]);
  const [branchId, setBranchId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [operatorId, setOperatorId] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

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
    } catch (error) {
      setBranchError(getErrorMessage(error));
      setBranches([]);
      setBranchId('');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  const loadData = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setTables([]);
      setReservations([]);
      setOperators([]);
      setDataError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setDataError(null);
    try {
      const [reservationList, tableList, userList] = await Promise.all([
        listReservations(selectedBranchId, today),
        listTables(selectedBranchId),
        isGlobalAdmin ? listUsers(selectedBranchId) : Promise.resolve([] as User[]),
      ]);
      setReservations(reservationList);
      setTables(tableList);
      setOperators(
        userList.filter((operator) => (
          operator.activo && (operator.rol === 'cajero' || operator.rol === 'admin_sucursal')
        )),
      );
    } catch (error) {
      setReservations([]);
      setTables([]);
      setOperators([]);
      setDataError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [isGlobalAdmin, today]);

  useEffect(() => { void loadBranches(); }, [loadBranches]);
  useEffect(() => { void loadData(branchId); }, [branchId, loadData]);

  useEffect(() => {
    setForm(initialForm());
    setNotice(null);
  }, [branchId]);

  useEffect(() => {
    setOperatorId((current) => (
      operators.some((operator) => String(operator.id_usuario) === current)
        ? current
        : String(operators[0]?.id_usuario || '')
    ));
  }, [operators]);

  const tableOptions = useMemo(
    () => tables
      .filter((table) => table.estado !== 'mantenimiento')
      .map((table) => ({
        value: String(table.id_mesa),
        label: `Mesa ${table.numero_mesa}`,
        description: table.tipo_mesa,
      })),
    [tables],
  );

  const operatorOptions = useMemo(
    () => operators.map((operator) => ({
      value: String(operator.id_usuario),
      label: operator.nombre,
      description: operator.username || operator.rol.replaceAll('_', ' '),
    })),
    [operators],
  );

  const agenda = useMemo(
    () => reservations
      .filter((reservation) => reservation.estado === 'pendiente' || reservation.estado === 'confirmada')
      .sort((first, second) => first.hora_inicio.localeCompare(second.hora_inicio)),
    [reservations],
  );

  const selectedBranchName = branches.find((branch) => String(branch.id_sucursal) === branchId)?.nombre;

  const submitReservation = async () => {
    if (!branchId) {
      setNotice({ kind: 'error', text: 'Selecciona una sucursal antes de registrar una reserva.' });
      return;
    }
    if (!form.nombre_cliente.trim()) {
      setNotice({ kind: 'error', text: 'El nombre del cliente es obligatorio.' });
      return;
    }
    if (!form.telefono_cliente.trim()) {
      setNotice({ kind: 'error', text: 'El teléfono del cliente es obligatorio.' });
      return;
    }
    if (!form.id_mesa) {
      setNotice({ kind: 'error', text: 'Selecciona la mesa solicitada.' });
      return;
    }
    if (!isValidTime(form.hora_inicio)) {
      setNotice({ kind: 'error', text: 'La hora debe tener formato HH:MM (por ejemplo 20:00).' });
      return;
    }

    const durationHours = Number(form.duracion_horas);
    if (!Number.isInteger(durationHours) || durationHours <= 0) {
      setNotice({ kind: 'error', text: 'Selecciona una duración válida.' });
      return;
    }

    const payload: ReservationInput = {
      nombre_cliente: form.nombre_cliente.trim(),
      telefono_cliente: form.telefono_cliente.trim(),
      fecha_reserva: today,
      hora_inicio: form.hora_inicio,
      duracion_minutos: durationHours * 60,
      id_mesa: Number(form.id_mesa),
      estado: 'confirmada',
    };

    setSubmitting(true);
    setNotice(null);
    try {
      await createReservation(payload);
      setNotice({
        kind: 'success',
        text: `Reserva confirmada para ${payload.nombre_cliente} a las ${payload.hora_inicio}.`,
      });
      setForm((current) => ({
        ...current,
        nombre_cliente: '',
        telefono_cliente: '',
        id_mesa: '',
      }));
      await loadData(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelReservation = async (reservation: Reservation) => {
    setNotice(null);
    try {
      await updateReservationStatus(reservation.id_reserva, 'cancelada');
      setNotice({ kind: 'success', text: `Reserva de ${reservation.nombre_cliente} cancelada.` });
      await loadData(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    }
  };

  const startTable = async (reservation: Reservation) => {
    let operator = Number(user.id_usuario);
    if (isGlobalAdmin) {
      const selectedOperator = operators.find((item) => String(item.id_usuario) === operatorId) || operators[0];
      if (!selectedOperator) {
        setNotice({ kind: 'error', text: 'No hay un operador activo en esta sucursal para iniciar la mesa.' });
        return;
      }
      operator = Number(selectedOperator.id_usuario);
    }

    setStartingId(String(reservation.id_reserva));
    setNotice(null);
    try {
      await createSession({ id_mesa: Number(reservation.id_mesa), id_usuario: operator });
      await updateReservationStatus(reservation.id_reserva, 'atendida');
      setNotice({
        kind: 'success',
        text: `Mesa ${reservation.numero_mesa || reservation.id_mesa} iniciada para ${reservation.nombre_cliente}.`,
      });
      await loadData(branchId);
      onOpenPos?.(String(reservation.id_mesa));
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setStartingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          {isGlobalAdmin && operatorOptions.length ? (
            <View style={styles.operatorPicker}>
              <Text style={styles.toolbarLabel}>OPERADOR PARA INICIAR MESAS</Text>
              <OptionPicker
                label="Operador para iniciar mesas"
                onSelect={setOperatorId}
                options={operatorOptions}
                placeholder="Seleccionar operador"
                value={operatorId}
              />
            </View>
          ) : null}
        </View>

        {branchLoading ? <StatusCard title="Cargando sucursales…" /> : null}
        {branchError ? <StatusCard title={branchError} tone="error" /> : null}
        {notice ? (
          <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.mainGrid}>
          <View style={[styles.panel, stacked ? styles.panelStacked : styles.formPanel]}>
            <Text style={styles.panelTitle}>Agendar Nueva Reserva</Text>
            <Text style={styles.panelSubtitle}>
              El sistema valida automáticamente que no existan cruces horarios en la mesa.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del Cliente</Text>
              <TextInput
                accessibilityLabel="Nombre del cliente"
                onChangeText={(value) => setForm((current) => ({ ...current, nombre_cliente: value }))}
                placeholder="Ej. Carlos Mendoza"
                style={styles.input}
                value={form.nombre_cliente}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Teléfono / WhatsApp</Text>
              <TextInput
                accessibilityLabel="Teléfono del cliente"
                keyboardType="phone-pad"
                onChangeText={(value) => setForm((current) => ({ ...current, telefono_cliente: value }))}
                placeholder="Ej. 70712345"
                style={styles.input}
                value={form.telefono_cliente}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mesa Solicitada</Text>
              <OptionPicker
                disabled={!tableOptions.length}
                label="Mesa solicitada"
                onSelect={(value) => setForm((current) => ({ ...current, id_mesa: value }))}
                options={tableOptions}
                placeholder={tableOptions.length ? 'Seleccionar mesa' : 'Sin mesas disponibles'}
                value={form.id_mesa}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Hora Inicio</Text>
                <TextInput
                  accessibilityLabel="Hora de inicio"
                  maxLength={5}
                  onChangeText={(value) => setForm((current) => ({ ...current, hora_inicio: value }))}
                  placeholder="20:00"
                  style={styles.input}
                  value={form.hora_inicio}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Duración (Horas)</Text>
                <OptionPicker
                  label="Duración de la reserva"
                  onSelect={(value) => setForm((current) => ({ ...current, duracion_horas: value }))}
                  options={DURATION_OPTIONS}
                  value={form.duracion_horas}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={submitting || !branchId || !tableOptions.length}
              onPress={submitReservation}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (submitting || !branchId || !tableOptions.length) && styles.disabled,
              ]}
            >
              {submitting
                ? <ActivityIndicator color="#04130d" size="small" />
                : <Text style={styles.primaryText}>Confirmar Reserva</Text>}
            </Pressable>

            {dataError ? <StatusCard title={dataError} tone="error" /> : null}
          </View>

          <View style={[styles.panel, stacked ? styles.panelStacked : styles.agendaPanel]}>
            <View style={styles.agendaHeader}>
              <View style={styles.agendaHeading}>
                <Text style={styles.panelTitle}>Agenda de Reservas de Hoy</Text>
                <Text style={styles.panelSubtitle}>Reservas confirmadas para la sucursal activa</Text>
              </View>
              <View style={styles.turnChip}>
                <CalendarClock color={colors.accent} size={13} />
                <Text style={styles.turnChipText}>
                  {selectedBranchName ? `${selectedBranchName} · Hoy` : 'Hoy · Turno Noche'}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loaderText}>Cargando agenda…</Text>
              </View>
            ) : !agenda.length ? (
              <View style={styles.emptyState}>
                <CalendarClock color={colors.textMuted} size={30} />
                <Text style={styles.emptyText}>No hay reservas registradas para hoy en esta sucursal.</Text>
              </View>
            ) : (
              <View style={styles.reservationsList}>
                {agenda.map((reservation) => (
                  <View key={String(reservation.id_reserva)} style={styles.reservationCard}>
                    <View style={styles.reservationMain}>
                      <View style={styles.timeBox}>
                        <Text style={styles.timeText}>{reservation.hora_inicio.slice(0, 5)}</Text>
                      </View>
                      <View style={styles.reservationCopy}>
                        <Text style={styles.clientName}>
                          {reservation.nombre_cliente}{' '}
                          <Text style={styles.clientPhone}>({reservation.telefono_cliente})</Text>
                        </Text>
                        <Text style={styles.reservationMeta}>
                          Mesa {reservation.numero_mesa || reservation.id_mesa} • Duración: {durationLabel(reservation.duracion_minutos)}
                        </Text>
                        {reservation.estado === 'pendiente' ? (
                          <Text style={styles.pendingText}>Pendiente de confirmación</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.reservationActions}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={startingId === String(reservation.id_reserva)}
                        onPress={() => startTable(reservation)}
                        style={({ pressed }) => [
                          styles.startButton,
                          pressed && styles.pressed,
                          startingId === String(reservation.id_reserva) && styles.disabled,
                        ]}
                      >
                        {startingId === String(reservation.id_reserva) ? (
                          <ActivityIndicator color="#04130d" size="small" />
                        ) : (
                          <>
                            <Play color="#04130d" size={14} fill="#04130d" />
                            <Text style={styles.startButtonText}>Iniciar Mesa</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Cancelar la reserva de ${reservation.nombre_cliente}`}
                        accessibilityRole="button"
                        onPress={() => cancelReservation(reservation)}
                        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                      >
                        <Trash2 color={colors.textMuted} size={16} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

function StatusCard({ title, tone = 'info' }: { title: string; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.statusCard, tone === 'error' && styles.statusCardError]}>
      <Text style={[styles.statusText, tone === 'error' && styles.statusTextError]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 16, width: '100%', maxWidth: 1600, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  toolbarLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },
  operatorPicker: { width: 240, maxWidth: '100%' },
  notice: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700' },
  mainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows,
  },
  formPanel: { flex: 4, minWidth: 300 },
  agendaPanel: { flex: 8, minWidth: 380 },
  panelStacked: { width: '100%' },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  panelSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 16, lineHeight: 17 },
  fieldGroup: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  fieldHalf: { flex: 1, minWidth: 0 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    width: '100%',
  },
  primaryText: { color: '#04130d', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.55 },
  agendaHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  agendaHeading: { flex: 1, minWidth: 220 },
  turnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  turnChipText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  loaderWrap: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  loaderText: { color: colors.textMuted, fontSize: 12 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: 18,
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
  },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  reservationsList: { gap: 12 },
  reservationCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  reservationMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 220 },
  timeBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.32)',
  },
  timeText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  reservationCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  clientName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  clientPhone: { color: colors.textMuted, fontSize: 12, fontWeight: '400' },
  reservationMeta: { color: colors.accent, fontSize: 12, marginTop: 4 },
  pendingText: { color: colors.warning, fontSize: 11, fontWeight: '700', marginTop: 4 },
  reservationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: colors.accent,
  },
  startButtonText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statusCardError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusText: { color: colors.text, fontWeight: '700' },
  statusTextError: { color: colors.danger },
});
