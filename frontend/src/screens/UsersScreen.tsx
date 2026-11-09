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
} from 'react-native';
import { BranchPicker } from '../components/BranchPicker';
import { ApiError } from '../services/api';
import { listBranches } from '../services/products';
import { createUser, deactivateUser, listUsers, type User, type UserInput, updateUser } from '../services/users';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

type UserForm = {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin_general' | 'admin_sucursal' | 'cajero';
  id_sucursal: string;
};

const emptyForm = (): UserForm => ({
  nombre: '',
  email: '',
  password: '',
  rol: 'cajero',
  id_sucursal: '',
});

export default function UsersScreen() {
  const [branches, setBranches] = useState<Array<{ id_sucursal: number | string; nombre: string; estado: boolean }>>([]);
  const [branchId, setBranchId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actingUserId, setActingUserId] = useState<number | string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());

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

  const loadUsers = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setUsers([]);
      setUsersError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setUsersError(null);
    try {
      const result = await listUsers(selectedBranchId);
      setUsers(result);
    } catch (error) {
      setUsers([]);
      setUsersError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    void loadUsers(branchId);
  }, [branchId, loadUsers]);

  const activeCount = useMemo(() => users.filter((person) => person.activo).length, [users]);

  const openCreate = () => {
    setFormError(null);
    setForm({ ...emptyForm(), id_sucursal: branchId || '' });
    setFormVisible(true);
  };

  const submitUser = async () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Nombre, correo y contraseña son obligatorios.');
      return;
    }

    const payload: UserInput = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      rol: form.rol,
      id_sucursal: form.rol === 'admin_general' ? null : Number(form.id_sucursal || branchId || 0),
    };

    if (payload.rol !== 'admin_general' && (!payload.id_sucursal || Number(payload.id_sucursal) <= 0)) {
      setFormError('Selecciona una sucursal válida para este rol.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createUser(payload);
      setNotice({ kind: 'success', text: 'Usuario registrado correctamente.' });
      setFormVisible(false);
      await loadUsers(branchId);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = async (user: User) => {
    setActingUserId(user.id_usuario);
    try {
      const updated = await updateUser(user.id_usuario, { activo: !user.activo });
      setNotice({ kind: 'success', text: `Usuario ${updated.nombre} marcado como ${updated.activo ? 'activo' : 'inactivo'}.` });
      await loadUsers(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setActingUserId(null);
    }
  };

  const deactivateSelected = async (user: User) => {
    setActingUserId(user.id_usuario);
    try {
      await deactivateUser(user.id_usuario);
      setNotice({ kind: 'success', text: `Usuario ${user.nombre} desactivado.` });
      await loadUsers(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>OPERACIÓN · PERSONAL</Text>
              <Text style={styles.pageTitle}>Usuarios y operadores</Text>
              <Text style={styles.subtitle}>Gestiona operadores, cajeros y administradores por sucursal.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!branchId}
              onPress={openCreate}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !branchId && styles.disabledButton]}
            >
              <Text style={styles.primaryText}>＋ Nuevo usuario</Text>
            </Pressable>
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
            <MetricCard label="Activos" value={String(activeCount)} accent />
            <MetricCard label="Totales" value={String(users.length)} />
          </View>

          {notice ? (
            <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
              <Text style={styles.noticeText}>{notice.text}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loaderText}>Cargando usuarios…</Text>
            </View>
          ) : usersError ? (
            <StatusCard title={usersError} tone="error" />
          ) : null}
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Personal</Text>
          {!users.length ? (
            <Text style={styles.emptyText}>No hay usuarios activos para esta sucursal.</Text>
          ) : (
            users.map((user) => (
              <View key={String(user.id_usuario)} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View>
                    <Text style={styles.userName}>{user.nombre}</Text>
                    <Text style={styles.userMeta}>{user.email}</Text>
                    <Text style={styles.userMeta}>{roleLabel(user.rol)} · {user.id_sucursal ? `Sucursal ${user.id_sucursal}` : 'Central'}</Text>
                  </View>
                  <View style={[styles.badge, user.activo ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{user.activo ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={actingUserId === user.id_usuario}
                    onPress={() => toggleUser(user)}
                    style={({ pressed }) => [styles.actionButton, styles.secondaryAction, actingUserId === user.id_usuario && styles.disabledButton, pressed && styles.pressed]}
                  >
                    {actingUserId === user.id_usuario ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>{user.activo ? 'Desactivar' : 'Activar'}</Text>}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={actingUserId === user.id_usuario}
                    onPress={() => deactivateSelected(user)}
                    style={({ pressed }) => [styles.actionButton, styles.dangerAction, actingUserId === user.id_usuario && styles.disabledButton, pressed && styles.pressed]}
                  >
                    {actingUserId === user.id_usuario ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Eliminar</Text>}
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
            <Text style={styles.modalTitle}>Crear usuario</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput onChangeText={(value) => setForm((current) => ({ ...current, nombre: value }))} style={styles.input} value={form.nombre} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Correo</Text>
              <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} style={styles.input} value={form.email} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput autoCapitalize="none" onChangeText={(value) => setForm((current) => ({ ...current, password: value }))} secureTextEntry style={styles.input} value={form.password} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.segmentRow}>
                {(['admin_general', 'admin_sucursal', 'cajero'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setForm((current) => ({ ...current, rol: option, id_sucursal: option === 'admin_general' ? '' : current.id_sucursal || branchId || '' }))}
                    style={[styles.segmentOption, form.rol === option && styles.segmentOptionActive]}
                  >
                    <Text style={[styles.segmentText, form.rol === option && styles.segmentTextActive]}>{roleLabel(option)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {form.rol !== 'admin_general' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Sucursal</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(value) => setForm((current) => ({ ...current, id_sucursal: value }))}
                  placeholder={String(branchId || '')}
                  style={styles.input}
                  value={form.id_sucursal}
                />
              </View>
            ) : null}

            {formError ? <Text style={styles.inlineError}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setFormVisible(false)} style={[styles.actionButton, styles.secondaryAction]}>
                <Text style={styles.actionText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={submitUser} style={[styles.actionButton, styles.primaryAction]} disabled={submitting}>
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
  return 'Ocurrió un error inesperado.';
}

function roleLabel(value: User['rol']) {
  return value === 'admin_general' ? 'Admin general' : value === 'admin_sucursal' ? 'Admin sucursal' : 'Cajero';
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
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
  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  panelTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  userCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  userName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  userMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  badgeInactive: { backgroundColor: 'rgba(148, 163, 184, 0.12)' },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryAction: { backgroundColor: colors.accent },
  secondaryAction: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  dangerAction: { backgroundColor: colors.danger },
  actionText: { color: '#08110a', fontWeight: '800', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.82)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
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
  segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segmentOption: { flex: 1, minWidth: 90, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  segmentOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  segmentText: { color: colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: colors.accent },
  inlineError: { color: '#ffd4dc', marginBottom: 10, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
});
