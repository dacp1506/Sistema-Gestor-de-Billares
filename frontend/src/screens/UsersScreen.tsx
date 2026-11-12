import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { OptionPicker } from '../components/OptionPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches, type Branch } from '../services/products';
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type User,
  type UserInput,
  type UserRole,
} from '../services/users';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

type UserForm = {
  nombre: string;
  username: string;
  email: string;
  password: string;
  rol: UserRole;
  id_sucursal: string;
  activo: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,60}$/;

const roleLabels: Record<UserRole, string> = {
  admin_general: 'Admin General',
  admin_sucursal: 'Admin Sucursal',
  cajero: 'Cajero / Operador',
};

const roleFilterOptions = [
  { value: 'all', label: 'Todos los Roles' },
  { value: 'admin_general', label: 'Administrador General' },
  { value: 'admin_sucursal', label: 'Admin de Sucursal' },
  { value: 'cajero', label: 'Cajero / Operador' },
];

const roleFormOptions = roleFilterOptions.slice(1);

function emptyForm(branchId = ''): UserForm {
  return {
    nombre: '',
    username: '',
    email: '',
    password: '',
    rol: 'cajero',
    id_sucursal: branchId,
    activo: true,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Si ejecutas la app en un teléfono, configura EXPO_PUBLIC_API_URL con la IP local de tu computadora.`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado al comunicarse con el servidor.';
}

function credentialOf(user: User) {
  if (user.username) return `@${user.username}`;
  return user.email || 'Sin identificador';
}

function roleMeta(role: UserRole) {
  if (role === 'admin_general') {
    return {
      color: colors.warning,
      background: colors.warningSoft,
      border: 'rgba(245, 158, 11, 0.35)',
      icon: <Shield color={colors.warning} size={12} />,
    };
  }
  if (role === 'admin_sucursal') {
    return {
      color: colors.info,
      background: 'rgba(56, 189, 248, 0.14)',
      border: 'rgba(56, 189, 248, 0.35)',
      icon: <Shield color={colors.info} size={12} />,
    };
  }
  return {
    color: colors.accent,
    background: colors.accentSoft,
    border: 'rgba(16, 185, 129, 0.35)',
    icon: <Users color={colors.accent} size={12} />,
  };
}

export default function UsersScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [formVisible, setFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  useAccessibleModal(formVisible, () => setFormVisible(false));
  useAccessibleModal(Boolean(userToDeactivate), () => setUserToDeactivate(null));

  const activeBranches = useMemo(() => branches.filter((branch) => branch.estado), [branches]);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchError(null);
    try {
      setBranches(await listBranches());
    } catch (error) {
      setBranches([]);
      setBranchError(getErrorMessage(error));
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setUsersError(null);
    try {
      setUsers(await listUsers(undefined, true));
    } catch (error) {
      setUsers([]);
      setUsersError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
    void loadUsers();
  }, [loadBranches, loadUsers]);

  const branchOptions = useMemo(() => [
    { value: 'all', label: 'Todas las Sucursales' },
    ...branches.map((branch) => ({
      value: String(branch.id_sucursal),
      label: branch.nombre,
    })),
  ], [branches]);

  const modalBranchOptions = useMemo(() => activeBranches.map((branch) => ({
    value: String(branch.id_sucursal),
    label: branch.nombre,
  })), [activeBranches]);

  const activeCount = useMemo(() => users.filter((person) => person.activo).length, [users]);
  const adminCount = useMemo(() => users.filter((person) => person.rol === 'admin_sucursal').length, [users]);
  const cashierCount = useMemo(() => users.filter((person) => person.rol === 'cajero').length, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((person) => {
      const credential = credentialOf(person).toLocaleLowerCase();
      const matchesText = !query
        || person.nombre.toLocaleLowerCase().includes(query)
        || credential.includes(query);
      const matchesRole = roleFilter === 'all' || person.rol === roleFilter;
      const matchesBranch = branchFilter === 'all'
        || String(person.id_sucursal ?? '') === branchFilter;
      return matchesText && matchesRole && matchesBranch;
    });
  }, [users, search, roleFilter, branchFilter]);

  const branchNameOf = (person: User) => {
    if (person.rol === 'admin_general' || !person.id_sucursal) return 'Todas las Sucursales';
    return branches.find((branch) => String(branch.id_sucursal) === String(person.id_sucursal))?.nombre
      || `Sucursal #${person.id_sucursal}`;
  };

  const isSelf = (person: User) => String(person.id_usuario) === String(user.id_usuario);

  const defaultBranchId = () => String(activeBranches[0]?.id_sucursal || '');

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm(defaultBranchId()));
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (person: User) => {
    if (isSelf(person)) {
      setNotice({ kind: 'error', text: 'No puedes editar tu propia cuenta desde este módulo.' });
      return;
    }
    setEditingUser(person);
    setForm({
      nombre: person.nombre,
      username: person.username || '',
      email: person.email || '',
      password: '',
      rol: person.rol,
      id_sucursal: person.id_sucursal ? String(person.id_sucursal) : '',
      activo: person.activo,
    });
    setFormError(null);
    setFormVisible(true);
  };

  const changeRole = (value: string) => {
    const rol = value as UserRole;
    setForm((current) => ({
      ...current,
      rol,
      id_sucursal: rol === 'admin_general' ? '' : (current.id_sucursal || defaultBranchId()),
    }));
    setFormError(null);
  };

  const submitUser = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const username = form.username.trim();
    const password = form.password.trim();
    const needsEmail = form.rol === 'admin_general';

    if (!nombre) return setFormError('Ingresa el nombre completo del usuario.');
    if (nombre.length > 120) return setFormError('El nombre admite hasta 120 caracteres.');

    if (needsEmail) {
      if (!email) return setFormError('Ingresa el correo electrónico del administrador general.');
      if (!EMAIL_PATTERN.test(email)) return setFormError('Ingresa un correo electrónico válido.');
    } else {
      if (!username) return setFormError('Ingresa el nombre de usuario de la cuenta.');
      if (!USERNAME_PATTERN.test(username)) {
        return setFormError('El usuario debe tener de 3 a 60 caracteres y solo usar letras, números, punto, guion o guion bajo.');
      }
      if (!form.id_sucursal) return setFormError('Selecciona la sucursal asignada a este usuario.');
    }

    if (!editingUser && password.length < 12) {
      return setFormError('La contraseña debe tener al menos 12 caracteres.');
    }
    if (editingUser && password && password.length < 12) {
      return setFormError('La nueva contraseña debe tener al menos 12 caracteres.');
    }

    const identifier = needsEmail
      ? { email: email.toLocaleLowerCase(), username: null }
      : {
          username: username.toLocaleLowerCase(),
          ...(editingUser && editingUser.rol === 'admin_general' ? { email: null } : {}),
        };

    const base = {
      nombre,
      rol: form.rol,
      id_sucursal: needsEmail ? null : Number(form.id_sucursal),
      activo: form.activo,
      ...identifier,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingUser) {
        const updated = await updateUser(editingUser.id_usuario, {
          ...base,
          ...(password ? { password } : {}),
        });
        setUsers((current) => current.map((person) => (
          String(person.id_usuario) === String(updated.id_usuario) ? updated : person
        )));
        setNotice({ kind: 'success', text: `Usuario ${updated.nombre} actualizado correctamente.` });
      } else {
        const created = await createUser({ ...base, password } as UserInput);
        setUsers((current) => [...current, created]);
        setNotice({ kind: 'success', text: `Usuario ${created.nombre} creado correctamente.` });
      }
      setFormVisible(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (person: User) => {
    if (isSelf(person) || actingUserId) return;
    setActingUserId(String(person.id_usuario));
    setNotice(null);
    try {
      const updated = await updateUser(person.id_usuario, { activo: !person.activo });
      setUsers((current) => current.map((item) => (
        String(item.id_usuario) === String(updated.id_usuario) ? updated : item
      )));
      setNotice({
        kind: 'success',
        text: `Estado de ${updated.nombre}: ${updated.activo ? 'Activo' : 'Inactivo'}.`,
      });
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setActingUserId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return;
    setDeactivating(true);
    setNotice(null);
    try {
      const updated = await deactivateUser(userToDeactivate.id_usuario);
      setUsers((current) => current.map((item) => (
        String(item.id_usuario) === String(updated.id_usuario) ? updated : item
      )));
      setNotice({ kind: 'success', text: `Usuario ${updated.nombre} desactivado del sistema.` });
      setUserToDeactivate(null);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
      setUserToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  };

  const refresh = () => {
    void loadBranches();
    void loadUsers();
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setBranchFilter('all');
  };

  const formNeedsEmail = form.rol === 'admin_general';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        refreshControl={(
          <RefreshControl
            refreshing={loading || branchesLoading}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        )}
      >
        <View style={styles.kpiGrid}>
          <KpiCard
            icon={<UserCheck color={colors.accent} size={20} />}
            label="Usuarios Activos"
            tone="accent"
            value={loading ? '…' : String(activeCount)}
          />
          <KpiCard
            icon={<Shield color={colors.info} size={20} />}
            label="Admins de Sucursal"
            tone="info"
            value={loading ? '…' : String(adminCount)}
          />
          <KpiCard
            icon={<Users color={colors.warning} size={20} />}
            label="Cajeros / Operadores"
            tone="warning"
            value={loading ? '…' : String(cashierCount)}
          />
        </View>

        <View style={[styles.filterCard, shadows]}>
          <View style={[styles.filterRow, compact && styles.filterRowCompact]}>
            <View style={[styles.searchWrap, compact && styles.searchWrapCompact]}>
              <Search color={colors.textMuted} size={16} />
              <TextInput
                accessibilityLabel="Buscar por nombre o credencial"
                autoCapitalize="none"
                onChangeText={setSearch}
                placeholder="Buscar por nombre o correo..."
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                style={styles.searchInput}
                value={search}
              />
            </View>
            <View style={[styles.filterControl, compact && styles.filterControlCompact]}>
              <OptionPicker
                label="Rol"
                onSelect={(value) => setRoleFilter(value as 'all' | UserRole)}
                options={roleFilterOptions}
                value={roleFilter}
              />
            </View>
            <View style={[styles.filterControl, compact && styles.filterControlCompact]}>
              <OptionPicker
                label="Sucursal"
                onSelect={setBranchFilter}
                options={branchOptions}
                value={branchFilter}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={openCreate}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <UserPlus color={colors.background} size={16} strokeWidth={2.6} />
              <Text style={styles.primaryText}>Nuevo Usuario</Text>
            </Pressable>
          </View>
        </View>

        {branchError ? (
          <StatusCard
            kind="error"
            message={branchError}
            onAction={() => { void loadBranches(); }}
            title="No se pudieron cargar las sucursales"
          />
        ) : null}

        {notice ? (
          <Pressable
            accessibilityLabel="Descartar mensaje"
            accessibilityRole="button"
            onPress={() => setNotice(null)}
            style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeSuccess]}
          >
            <Text style={[styles.noticeText, notice.kind === 'error' ? styles.noticeErrorText : styles.noticeSuccessText]}>
              {notice.text}
            </Text>
            <Text style={styles.noticeDismiss}>×</Text>
          </Pressable>
        ) : null}

        {usersError ? (
          <StatusCard
            kind="error"
            message={usersError}
            onAction={() => { void loadUsers(); }}
            title="No se pudo cargar la lista de usuarios"
          />
        ) : null}

        <View style={[styles.tableCard, shadows]}>
          {!compact ? (
            <View style={styles.tableHead}>
              <Text style={[styles.headCell, styles.colUser]}>Usuario</Text>
              <Text style={[styles.headCell, styles.colRole]}>Rol Asignado</Text>
              <Text style={[styles.headCell, styles.colBranch]}>Sucursal</Text>
              <Text style={[styles.headCell, styles.colCredential]}>Credencial</Text>
              <Text style={[styles.headCell, styles.colStatus]}>Estado</Text>
              <Text style={[styles.headCell, styles.colActions, styles.alignRight]}>Acciones</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.emptyText}>Cargando usuarios…</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyState}>
              <Users color={colors.textMuted} size={34} />
              <Text style={styles.emptyTitle}>Sin usuarios registrados</Text>
              <Text style={styles.emptyText}>Crea la primera cuenta para comenzar a operar el sistema.</Text>
              <Pressable accessibilityRole="button" onPress={openCreate} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Registrar usuario</Text>
              </Pressable>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Search color={colors.textMuted} size={30} />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>Ningún usuario coincide con los filtros seleccionados.</Text>
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
              </Pressable>
            </View>
          ) : compact ? (
            filteredUsers.map((person) => {
              const self = isSelf(person);
              const busy = actingUserId === String(person.id_usuario);
              return (
                <View key={String(person.id_usuario)} style={styles.userCard}>
                  <View style={styles.userCardTop}>
                    <View style={styles.userCardIdentity}>
                      <View style={styles.nameRow}>
                        <Text numberOfLines={1} style={styles.userName}>{person.nombre}</Text>
                        {self ? <Text style={styles.selfTag}>TÚ</Text> : null}
                      </View>
                      <Text style={styles.userId}>ID #{person.id_usuario}</Text>
                    </View>
                    <StatusPill
                      active={person.activo}
                      disabled={self}
                      loading={busy}
                      onPress={() => { void toggleStatus(person); }}
                    />
                  </View>

                  <View style={styles.badgeRow}>
                    <RoleBadge role={person.rol} />
                    <Text numberOfLines={1} style={styles.branchText}>{branchNameOf(person)}</Text>
                  </View>

                  <View style={styles.credentialRow}>
                    <KeyRound color={colors.textMuted} size={13} />
                    <Text numberOfLines={1} style={styles.credentialText}>{credentialOf(person)}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      accessibilityLabel={`Editar ${person.nombre}`}
                      accessibilityRole="button"
                      disabled={self}
                      onPress={() => openEdit(person)}
                      style={({ pressed }) => [
                        styles.cardAction,
                        pressed && styles.pressed,
                        self && styles.disabled,
                      ]}
                    >
                      <Pencil color={colors.info} size={14} />
                      <Text style={styles.cardActionText}>Editar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Desactivar ${person.nombre}`}
                      accessibilityRole="button"
                      disabled={self || !person.activo}
                      onPress={() => setUserToDeactivate(person)}
                      style={({ pressed }) => [
                        styles.cardAction,
                        styles.cardActionDanger,
                        pressed && styles.pressed,
                        (self || !person.activo) && styles.disabled,
                      ]}
                    >
                      <Trash2 color={colors.danger} size={14} />
                      <Text style={[styles.cardActionText, styles.cardActionDangerText]}>Desactivar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            filteredUsers.map((person) => {
              const self = isSelf(person);
              const busy = actingUserId === String(person.id_usuario);
              return (
                <View key={String(person.id_usuario)} style={styles.tableRow}>
                  <View style={styles.colUser}>
                    <View style={styles.nameRow}>
                      <Text numberOfLines={1} style={styles.userName}>{person.nombre}</Text>
                      {self ? <Text style={styles.selfTag}>TÚ</Text> : null}
                    </View>
                    <Text style={styles.userId}>ID #{person.id_usuario}</Text>
                  </View>
                  <View style={styles.colRole}>
                    <RoleBadge role={person.rol} />
                  </View>
                  <Text numberOfLines={1} style={[styles.colBranch, styles.cellText]}>
                    {branchNameOf(person)}
                  </Text>
                  <View style={styles.colCredential}>
                    <Text numberOfLines={1} style={styles.credentialText}>{credentialOf(person)}</Text>
                  </View>
                  <View style={styles.colStatus}>
                    <StatusPill
                      active={person.activo}
                      disabled={self}
                      loading={busy}
                      onPress={() => { void toggleStatus(person); }}
                    />
                  </View>
                  <View style={[styles.colActions, styles.rowActions]}>
                    <Pressable
                      accessibilityLabel={`Editar ${person.nombre}`}
                      accessibilityRole="button"
                      disabled={self}
                      onPress={() => openEdit(person)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.pressed,
                        self && styles.disabled,
                      ]}
                    >
                      <Pencil color={colors.info} size={14} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Desactivar ${person.nombre}`}
                      accessibilityRole="button"
                      disabled={self || !person.activo}
                      onPress={() => setUserToDeactivate(person)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        styles.iconButtonDanger,
                        pressed && styles.pressed,
                        (self || !person.activo) && styles.disabled,
                      ]}
                    >
                      <Trash2 color={colors.danger} size={14} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.footerNote}>
          {filteredUsers.length} de {users.length} usuarios · Los cambios se guardan en la base de datos.
        </Text>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!submitting) setFormVisible(false);
        }}
        transparent
        visible={formVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalLayer}
        >
          <View accessibilityViewIsModal style={[styles.modal, shadows]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingCopy}>
                <Text style={styles.modalEyebrow}>ACCESO AL SISTEMA</Text>
                <Text style={styles.modalTitle}>
                  {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => setFormVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formBody}>
              <FormField
                label="Nombre Completo *"
                onChangeText={(value) => setForm((current) => ({ ...current, nombre: value }))}
                placeholder="Ej. Carla Méndez"
                value={form.nombre}
                maxLength={120}
              />

              <FormField
                autoCapitalize="none"
                keyboardType={formNeedsEmail ? 'email-address' : 'default'}
                label={formNeedsEmail ? 'Correo Electrónico *' : 'Nombre de Usuario *'}
                onChangeText={(value) => setForm((current) => (
                  formNeedsEmail
                    ? { ...current, email: value }
                    : { ...current, username: value }
                ))}
                placeholder={formNeedsEmail ? 'carla.mendez@bola8.bo' : 'Ej. carla.mendez'}
                value={formNeedsEmail ? form.email : form.username}
                maxLength={255}
              />

              <View style={[styles.formRow, compact && styles.formRowCompact]}>
                <View style={styles.formColumn}>
                  <Text style={styles.fieldLabel}>Rol en el Sistema</Text>
                  <OptionPicker
                    label="Rol en el Sistema"
                    onSelect={changeRole}
                    options={roleFormOptions}
                    value={form.rol}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.fieldLabel}>Sucursal Asignada</Text>
                  {formNeedsEmail ? (
                    <View style={styles.readOnlyBox}>
                      <Text style={styles.readOnlyText}>Todas las sucursales (global)</Text>
                    </View>
                  ) : (
                    <OptionPicker
                      label="Sucursal Asignada"
                      onSelect={(value) => setForm((current) => ({ ...current, id_sucursal: value }))}
                      options={modalBranchOptions}
                      placeholder="Seleccionar sucursal"
                      value={form.id_sucursal}
                    />
                  )}
                </View>
              </View>

              <View style={[styles.formRow, compact && styles.formRowCompact]}>
                <View style={styles.formColumn}>
                  <FormField
                    autoCapitalize="none"
                    label={editingUser ? 'Contraseña (opcional)' : 'Contraseña *'}
                    onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
                    placeholder={editingUser ? 'Dejar vacío para mantener' : 'Mínimo 12 caracteres'}
                    secureTextEntry
                    value={form.password}
                    maxLength={255}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.fieldLabel}>Estado</Text>
                  <View accessibilityRole="radiogroup" style={styles.segmentRow}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: form.activo }}
                      onPress={() => setForm((current) => ({ ...current, activo: true }))}
                      style={[styles.segmentOption, form.activo && styles.segmentOptionActive]}
                    >
                      <Text style={[styles.segmentText, form.activo && styles.segmentTextActive]}>Activo</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: !form.activo }}
                      onPress={() => setForm((current) => ({ ...current, activo: false }))}
                      style={[styles.segmentOption, !form.activo && styles.segmentOptionInactive]}
                    >
                      <Text style={[styles.segmentText, !form.activo && styles.segmentTextInactive]}>Inactivo</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <Text style={styles.hint}>
                Los campos con * son obligatorios. Los usuarios de sucursal inician sesión con su nombre de usuario;
                el administrador general lo hace con su correo.
              </Text>

              {formError ? (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => setFormVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => { void submitUser(); }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]}
              >
                {submitting
                  ? <ActivityIndicator color={colors.background} size="small" />
                  : (
                    <Text style={styles.primaryText}>
                      {editingUser ? 'Guardar Usuario' : 'Crear Usuario'}
                    </Text>
                  )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!deactivating) setUserToDeactivate(null);
        }}
        transparent
        visible={Boolean(userToDeactivate)}
      >
        <View style={styles.modalLayer}>
          <View accessibilityRole="alert" style={[styles.confirmModal, shadows]}>
            <Text style={styles.modalEyebrow}>CONFIRMAR ACCIÓN</Text>
            <Text style={styles.modalTitle}>Desactivar usuario</Text>
            <Text style={styles.confirmMessage}>
              {userToDeactivate
                ? `¿Desactivar a “${userToDeactivate.nombre}”? No podrá iniciar sesión, pero su historial de operaciones se conserva.`
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={deactivating}
                onPress={() => setUserToDeactivate(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deactivating}
                onPress={() => { void confirmDeactivate(); }}
                style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed, deactivating && styles.disabled]}
              >
                {deactivating
                  ? <ActivityIndicator color={colors.background} size="small" />
                  : <Text style={styles.dangerText}>Desactivar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'accent' | 'info' | 'warning';
}) {
  return (
    <View style={[styles.kpiCard, shadows]}>
      <View style={styles.kpiCopy}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={[
          styles.kpiValue,
          tone === 'accent' && styles.kpiAccent,
          tone === 'info' && styles.kpiInfo,
          tone === 'warning' && styles.kpiWarning,
        ]}>
          {value}
        </Text>
      </View>
      <View style={[
        styles.kpiIcon,
        tone === 'accent' && styles.kpiIconAccent,
        tone === 'info' && styles.kpiIconInfo,
        tone === 'warning' && styles.kpiIconWarning,
      ]}>
        {icon}
      </View>
    </View>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const meta = roleMeta(role);
  return (
    <View style={[styles.roleBadge, { backgroundColor: meta.background, borderColor: meta.border }]}>
      {meta.icon}
      <Text numberOfLines={1} style={[styles.roleBadgeText, { color: meta.color }]}>
        {roleLabels[role]}
      </Text>
    </View>
  );
}

function StatusPill({
  active,
  disabled,
  loading,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={active ? 'Desactivar usuario' : 'Activar usuario'}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusPill,
        active ? styles.statusActive : styles.statusInactive,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={active ? colors.accent : colors.textMuted} size="small" />
      ) : (
        <>
          <View style={[styles.statusDot, active ? styles.statusDotActive : styles.statusDotInactive]} />
          <Text style={[styles.statusPillText, active ? styles.statusPillTextActive : styles.statusPillTextInactive]}>
            {active ? 'Activo' : 'Inactivo'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function StatusCard({
  title,
  message,
  kind = 'neutral',
  onAction,
}: {
  title: string;
  message?: string;
  kind?: 'neutral' | 'error';
  onAction?: () => void;
}) {
  return (
    <View style={[styles.statusCard, kind === 'error' && styles.statusError]}>
      <RefreshCw color={kind === 'error' ? colors.danger : colors.textMuted} size={18} />
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{title}</Text>
        {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
      </View>
      {onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.statusAction}>
          <Text style={styles.statusActionText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FormField({
  label,
  keyboardType = 'default',
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        autoCapitalize={inputProps.autoCapitalize || 'sentences'}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  contentCompact: { padding: 14, gap: 13 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    flex: 1,
    minWidth: 210,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kpiCopy: { flex: 1, minWidth: 0 },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  kpiValue: { fontSize: 26, fontWeight: '900', marginTop: 6 },
  kpiAccent: { color: colors.accent },
  kpiInfo: { color: colors.info },
  kpiWarning: { color: colors.warning },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconAccent: { backgroundColor: colors.accentSoft },
  kpiIconInfo: { backgroundColor: 'rgba(56, 189, 248, 0.14)' },
  kpiIconWarning: { backgroundColor: colors.warningSoft },

  filterCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  searchWrap: {
    minHeight: 46,
    flex: 1,
    minWidth: 200,
    maxWidth: 330,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  searchWrapCompact: { maxWidth: '100%' },
  searchInput: { flex: 1, color: colors.text, fontSize: 12, paddingVertical: 9 },
  filterControl: { width: 190 },
  filterControlCompact: { width: '100%' },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: colors.accent,
  },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
  },
  noticeSuccess: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  noticeSuccessText: { color: colors.accent },
  noticeErrorText: { color: colors.danger },
  noticeDismiss: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },

  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headCell: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.55)',
  },
  colUser: { flex: 2.2, minWidth: 0 },
  colRole: { flex: 1.4, minWidth: 0 },
  colBranch: { flex: 1.7, minWidth: 0 },
  colCredential: { flex: 1.6, minWidth: 0 },
  colStatus: { width: 118 },
  colActions: { width: 88, alignItems: 'flex-end' },
  alignRight: { textAlign: 'right' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  userId: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  selfTag: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  cellText: { color: colors.textMuted, fontSize: 12 },
  credentialText: { color: colors.textMuted, fontSize: 12, fontFamily: Platform.select({ web: 'monospace', default: undefined }) },

  roleBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: { flexShrink: 1, fontSize: 10, fontWeight: '800' },

  statusPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.35)' },
  statusInactive: { backgroundColor: 'rgba(148, 163, 184, 0.12)', borderColor: 'rgba(148, 163, 184, 0.3)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: colors.accent },
  statusDotInactive: { backgroundColor: colors.textMuted },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextActive: { color: colors.accent },
  statusPillTextInactive: { color: colors.textMuted },

  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  iconButtonDanger: { backgroundColor: colors.dangerSoft },

  userCard: {
    padding: 15,
    gap: 11,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.55)',
  },
  userCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  userCardIdentity: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  branchText: { flexShrink: 1, color: colors.textMuted, fontSize: 11 },
  credentialRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    paddingTop: 11,
    borderTopWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.7)',
  },
  cardAction: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
  },
  cardActionDanger: { backgroundColor: colors.dangerSoft },
  cardActionText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  cardActionDangerText: { color: colors.danger },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 34, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyButton: {
    marginTop: 8,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
  },
  emptyButtonText: { color: colors.accent, fontSize: 11, fontWeight: '800' },

  footerNote: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusError: { borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: colors.dangerSoft },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  statusMessage: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  statusAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  statusActionText: { color: colors.accent, fontSize: 11, fontWeight: '800' },

  modalLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  modal: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 430,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalHeadingCopy: { flex: 1, minWidth: 0 },
  modalEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 5 },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
  },
  closeText: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  formBody: { gap: 13, paddingTop: 14, paddingBottom: 4 },
  field: { flex: 1, gap: 7 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  input: {
    width: '100%',
    minHeight: 45,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 13,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowCompact: { flexDirection: 'column' },
  formColumn: { flex: 1, minWidth: 0 },
  readOnlyBox: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  readOnlyText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  segmentOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  segmentOptionInactive: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.45)' },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: colors.accent, fontWeight: '800' },
  segmentTextInactive: { color: colors.danger, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  errorBox: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    backgroundColor: colors.dangerSoft,
  },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  confirmMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 12 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    paddingTop: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cancelButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
  },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  dangerButton: {
    minHeight: 42,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  dangerText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
