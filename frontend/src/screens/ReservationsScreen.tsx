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
} from 'react-native';
import { BranchPicker } from '../components/BranchPicker';
import { ApiError } from '../services/api';
import { listBranches } from '../services/products';
import { createReservation, listReservations, updateReservationStatus, type Reservation, type ReservationInput } from '../services/reservations';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ReservationsScreen() {
  const [branches, setBranches] = useState<Array<{ id_sucursal: number | string; nombre: string; estado: boolean }>>([]);
  const [branchId, setBranchId] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre_cliente: '',
    telefono_cliente: '',
    fecha_reserva: todayISO(),
    hora_inicio: '19:00',
    duracion_minutos: '90',
    id_mesa: '',
  });

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

  const loadReservations = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setReservations([]);
      setReservationsError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReservationsError(null);
    try {
      const result = await listReservations(selectedBranchId, form.fecha_reserva || todayISO());
      setReservations(result);
    } catch (error) {
      setReservations([]);
      setReservationsError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [form.fecha_reserva]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    void loadReservations(branchId);
  }, [branchId, loadReservations]);

  const pendingReservations = useMemo(
    () => reservations.filter((reservation) => reservation.estado !== 'cancelada' && reservation.estado !== 'atendida').length,
    [reservations],
  );

  const submitReservation = async () => {
    if (!branchId) {
      setNotice({ kind: 'error', text: 'Selecciona una sucursal antes de registrar una reserva.' });
      return;
    }

    const idMesa = Number(form.id_mesa);
    const duracion = Number(form.duracion_minutos);

    if (!form.nombre_cliente.trim()) {
      setNotice({ kind: 'error', text: 'El nombre del cliente es obligatorio.' });
      return;
    }
    if (!form.telefono_cliente.trim()) {
      setNotice({ kind: 'error', text: 'El teléfono del cliente es obligatorio.' });
      return;
    }
    if (!Number.isInteger(idMesa) || idMesa <= 0) {
      setNotice({ kind: 'error', text: 'Ingresa un id_mesa válido.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_reserva)) {
      setNotice({ kind: 'error', text: 'La fecha debe tener formato YYYY-MM-DD.' });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.hora_inicio)) {
      setNotice({ kind: 'error', text: 'La hora debe tener formato HH:MM.' });
      return;
    }
    if (!Number.isInteger(duracion) || duracion <= 0 || duracion > 720) {
      setNotice({ kind: 'error', text: 'La duración debe ser un entero entre 1 y 720 minutos.' });
      return;
    }

    const payload: ReservationInput = {
      nombre_cliente: form.nombre_cliente.trim(),
      telefono_cliente: form.telefono_cliente.trim(),
      fecha_reserva: form.fecha_reserva,
      hora_inicio: form.hora_inicio,
      duracion_minutos: duracion,
      id_mesa: idMesa,
    };

    setSubmitting(true);
    setNotice(null);
    try {
      await createReservation(payload);
      setNotice({ kind: 'success', text: 'Reserva creada correctamente.' });
      setForm((current) => ({ ...current, nombre_cliente: '', telefono_cliente: '', id_mesa: '', duracion_minutos: '90', hora_inicio: '19:00' }));
      await loadReservations(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatusById = async (id: number | string, estado: Reservation['estado']) => {
    try {
      await updateReservationStatus(id, estado);
      setNotice({ kind: 'success', text: `Reserva marcada como ${estado}.` });
      await loadReservations(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>OPERACIÓN · RESERVAS</Text>
          <Text style={styles.pageTitle}>Agenda de mesas</Text>
          <Text style={styles.subtitle}>Control de reservas por sucursal y conflicto de horarios.</Text>

          <View style={styles.toolbar}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          </View>

          {branchLoading ? <StatusCard title="Cargando sucursales…" /> : null}
          {branchError ? <StatusCard title={branchError} tone="error" /> : null}

          <View style={styles.summaryGrid}>
            <MetricCard label="Reservas hoy" value={String(reservations.length)} />
            <MetricCard label="Pendientes" value={String(pendingReservations)} accent />
          </View>
        </View>

        {notice ? (
          <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.mainGrid}>
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Nueva reserva</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del cliente</Text>
              <TextInput
                value={form.nombre_cliente}
                onChangeText={(value) => setForm((current) => ({ ...current, nombre_cliente: value }))}
                placeholder="Ana Gómez"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                value={form.telefono_cliente}
                onChangeText={(value) => setForm((current) => ({ ...current, telefono_cliente: value }))}
                placeholder="70012345"
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Fecha</Text>
                <TextInput
                  value={form.fecha_reserva}
                  onChangeText={(value) => setForm((current) => ({ ...current, fecha_reserva: value }))}
                  placeholder="2026-11-09"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Hora</Text>
                <TextInput
                  value={form.hora_inicio}
                  onChangeText={(value) => setForm((current) => ({ ...current, hora_inicio: value }))}
                  placeholder="19:00"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Mesa</Text>
                <TextInput
                  value={form.id_mesa}
                  onChangeText={(value) => setForm((current) => ({ ...current, id_mesa: value }))}
                  placeholder="Ej. 12"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Duración (min)</Text>
                <TextInput
                  value={form.duracion_minutos}
                  onChangeText={(value) => setForm((current) => ({ ...current, duracion_minutos: value }))}
                  placeholder="90"
                  style={styles.input}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={submitting || !branchId}
              onPress={submitReservation}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (!branchId || submitting) && styles.disabledButton]}
            >
              {submitting ? <ActivityIndicator color="#04130d" size="small" /> : <Text style={styles.primaryText}>Guardar reserva</Text>}
            </Pressable>
          </View>

          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Reservas programadas</Text>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.loaderText}>Cargando reservas…</Text>
              </View>
            ) : reservationsError ? (
              <StatusCard title={reservationsError} tone="error" />
            ) : !reservations.length ? (
              <Text style={styles.emptyText}>No hay reservas para la fecha seleccionada.</Text>
            ) : (
              reservations.map((reservation) => (
                <View key={String(reservation.id_reserva)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{reservation.nombre_cliente}</Text>
                    <Text style={[styles.badge, reservation.estado === 'pendiente' ? styles.badgePending : reservation.estado === 'confirmada' ? styles.badgeConfirmed : reservation.estado === 'cancelada' ? styles.badgeCanceled : styles.badgeServed]}>
                      {reservation.estado}
                    </Text>
                  </View>
                  <Text style={styles.meta}>Mesa {reservation.numero_mesa || reservation.id_mesa} · {reservation.telefono_cliente}</Text>
                  <Text style={styles.meta}>{reservation.fecha_reserva} · {reservation.hora_inicio} ({reservation.duracion_minutos} min)</Text>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => updateStatusById(reservation.id_reserva, 'confirmada')} style={styles.actionButtonConfirm}>
                      <Text style={styles.actionTextConfirm}>Confirmar</Text>
                    </Pressable>
                    <Pressable onPress={() => updateStatusById(reservation.id_reserva, 'cancelada')} style={styles.actionButtonCancel}>
                      <Text style={styles.actionTextCancel}>Cancelar</Text>
                    </Pressable>
                  </View>
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
  return 'Ocurrió un error inesperado.';
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
    ...shadows,
  },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.textMuted, marginTop: 6, fontSize: 14 },
  toolbar: { marginTop: 14 },
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
  notice: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700' },
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
  fieldGroup: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldHalf: { flex: 1 },
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
  primaryText: { color: '#04130d', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.86 },
  disabledButton: { opacity: 0.5 },
  loaderWrap: { marginTop: 16, alignItems: 'center', paddingVertical: 14 },
  loaderText: { color: colors.textMuted, marginTop: 8 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  statusCard: { marginTop: 12, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statusCardError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusText: { color: colors.text, fontWeight: '700' },
  statusTextError: { color: '#ffd4dc' },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgePending: { backgroundColor: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24' },
  badgeConfirmed: { backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#10b981' },
  badgeCanceled: { backgroundColor: 'rgba(251, 113, 133, 0.12)', color: '#fb7185' },
  badgeServed: { backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButtonConfirm: { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  actionButtonCancel: { flex: 1, backgroundColor: 'rgba(251, 113, 133, 0.12)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  actionTextConfirm: { color: colors.accent, fontWeight: '800' },
  actionTextCancel: { color: colors.danger, fontWeight: '800' },
});
