import { useCallback, useEffect, useState } from 'react';
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
  Building2,
  CheckCircle2,
  LayoutDashboard,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import {
  createBranch,
  deactivateBranch,
  listBranches,
  updateBranch,
  type Branch,
  type BranchInput,
} from '../services/branches';
import { colors, shadows } from '../theme';

type BranchForm = { nombre: string; direccion: string; telefono: string };
type Notice = { kind: 'success' | 'error'; text: string } | null;

type BranchesScreenProps = {
  activeBranchId?: string;
  onOpenBranch?: (branchId: string) => void;
};

const emptyForm = (): BranchForm => ({ nombre: '', direccion: '', telefono: '' });

function money(value: number | string | undefined) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Si ejecutas la app en un teléfono, configura EXPO_PUBLIC_API_URL con la IP local de tu computadora.`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación con las sucursales.';
}

export default function BranchesScreen({ activeBranchId, onOpenBranch }: BranchesScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 860;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDeactivate, setBranchToDeactivate] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  useAccessibleModal(formVisible, () => setFormVisible(false));
  useAccessibleModal(Boolean(branchToDeactivate), () => setBranchToDeactivate(null));

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBranches(await listBranches());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm(emptyForm());
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      nombre: branch.nombre,
      direccion: branch.direccion || '',
      telefono: branch.telefono || '',
    });
    setFormError(null);
    setFormVisible(true);
  };

  const saveBranch = async () => {
    const nombre = form.nombre.trim();
    const direccion = form.direccion.trim();
    const telefono = form.telefono.trim();
    if (!nombre || nombre.length > 100) {
      setFormError('El nombre es obligatorio y debe tener hasta 100 caracteres.');
      return;
    }
    if (direccion.length > 255 || telefono.length > 30) {
      setFormError('La dirección admite hasta 255 caracteres y el teléfono hasta 30.');
      return;
    }

    const input: BranchInput = {
      nombre,
      direccion: direccion || null,
      telefono: telefono || null,
    };
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id_sucursal, input);
        setNotice({ kind: 'success', text: `Sucursal “${nombre}” actualizada correctamente.` });
      } else {
        await createBranch(input);
        setNotice({ kind: 'success', text: `Sucursal “${nombre}” registrada en la cadena Bola8.` });
      }
      setFormVisible(false);
      await loadBranches();
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!branchToDeactivate) return;
    setDeactivating(true);
    setNotice(null);
    try {
      await deactivateBranch(branchToDeactivate.id_sucursal);
      setNotice({ kind: 'success', text: `Sucursal “${branchToDeactivate.nombre}” desactivada. Sus registros históricos se conservan.` });
      setBranchToDeactivate(null);
      await loadBranches();
    } catch (deactivateError) {
      setNotice({ kind: 'error', text: getErrorMessage(deactivateError) });
      setBranchToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  };

  const openBranch = (branch: Branch) => {
    if (!onOpenBranch) return;
    onOpenBranch(String(branch.id_sucursal));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        refreshControl={(
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { void loadBranches(); }}
            tintColor={colors.accent}
          />
        )}
      >
        <View style={[styles.headerCard, shadows]}>
          <View style={[styles.headerTop, compact && styles.headerTopCompact]}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>ADMINISTRACIÓN · CADENA</Text>
              <Text style={styles.title}>Gestión Multi-Sucursal Cadena Bola8</Text>
              <Text style={styles.subtitle}>
                Administración centralizada de locales, capacidad de mesas e ingresos consolidados.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={openCreate}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Plus color={colors.background} size={16} strokeWidth={3} />
              <Text style={styles.primaryText}>Registrar Nueva Sucursal</Text>
            </Pressable>
          </View>
        </View>

        {notice ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Descartar mensaje"
            onPress={() => setNotice(null)}
            style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeSuccess]}
          >
            <Text style={[styles.noticeText, notice.kind === 'error' ? styles.noticeErrorText : styles.noticeSuccessText]}>
              {notice.text}
            </Text>
            <Text style={styles.noticeDismiss}>×</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <View style={[styles.statusCard, shadows]}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>Cargando sucursales de la cadena…</Text>
          </View>
        ) : error ? (
          <View style={[styles.statusCard, styles.statusError, shadows]}>
            <RefreshCw color={colors.danger} size={20} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>No se pudieron cargar las sucursales</Text>
              <Text style={styles.statusMessage}>{error}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => { void loadBranches(); }} style={styles.statusAction}>
              <Text style={styles.statusActionText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : branches.length === 0 ? (
          <View style={[styles.statusCard, shadows]}>
            <Building2 color={colors.textMuted} size={30} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>Todavía no hay sucursales activas</Text>
              <Text style={styles.statusMessage}>
                Registra la primera sucursal para comenzar a operar la cadena.
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={openCreate} style={styles.statusAction}>
              <Text style={styles.statusActionText}>Registrar sucursal</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {branches.map((branch) => {
                const selected = String(branch.id_sucursal) === String(activeBranchId || '');
                return (
                  <View
                    key={String(branch.id_sucursal)}
                    style={[
                      styles.branchCard,
                      shadows,
                      selected && styles.branchCardSelected,
                      compact && styles.branchCardCompact,
                    ]}
                  >
                    <View>
                      <View style={styles.cardHeader}>
                        <Text numberOfLines={2} style={styles.branchName}>{branch.nombre}</Text>
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeText}>ACTIVA</Text>
                        </View>
                      </View>

                      <View style={styles.contactRow}>
                        <MapPin color={colors.textMuted} size={14} />
                        <Text numberOfLines={2} style={styles.contactText}>
                          {branch.direccion || 'Dirección no registrada'}
                        </Text>
                      </View>
                      <View style={styles.contactRow}>
                        <Phone color={colors.textMuted} size={14} />
                        <Text numberOfLines={1} style={styles.contactText}>
                          {branch.telefono || 'Teléfono no registrado'}
                        </Text>
                      </View>

                      <View style={styles.statsBox}>
                        <View style={styles.statCell}>
                          <Text style={styles.statLabel}>Mesas Activas</Text>
                          <Text style={styles.statValue}>
                            {Number(branch.mesas_ocupadas || 0)} / {Number(branch.mesas_total || 0)}
                          </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statCell}>
                          <Text style={styles.statLabel}>Ingresos Hoy</Text>
                          <Text style={[styles.statValue, styles.statIncome]}>{money(branch.ingresos_hoy)}</Text>
                        </View>
                      </View>
                    </View>

                    <View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={selected ? `${branch.nombre} es la sucursal seleccionada` : `Administrar ${branch.nombre}`}
                        disabled={!onOpenBranch}
                        onPress={() => openBranch(branch)}
                        style={({ pressed }) => [
                          styles.openButton,
                          selected ? styles.openButtonSelected : styles.openButtonDefault,
                          pressed && styles.pressed,
                          !onOpenBranch && styles.disabled,
                        ]}
                      >
                        {selected
                          ? <CheckCircle2 color={colors.accent} size={15} />
                          : <LayoutDashboard color={colors.text} size={15} />}
                        <Text style={[styles.openButtonText, selected && styles.openButtonTextSelected]}>
                          {selected ? 'Sucursal Seleccionada' : 'Administrar esta Sucursal'}
                        </Text>
                      </Pressable>

                      <View style={styles.cardActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Editar ${branch.nombre}`}
                          onPress={() => openEdit(branch)}
                          style={({ pressed }) => [styles.cardAction, pressed && styles.pressed]}
                        >
                          <Pencil color={colors.textMuted} size={13} />
                          <Text style={styles.cardActionText}>Editar datos</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Desactivar ${branch.nombre}`}
                          onPress={() => setBranchToDeactivate(branch)}
                          style={({ pressed }) => [styles.cardAction, styles.cardActionDanger, pressed && styles.pressed]}
                        >
                          <Trash2 color={colors.danger} size={13} />
                          <Text style={[styles.cardActionText, styles.cardActionDangerText]}>Desactivar</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.footerNote}>
              {branches.length} {branches.length === 1 ? 'sucursal activa' : 'sucursales activas'} · Las métricas se actualizan desde la base de datos.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setFormVisible(false);
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
              <View>
                <Text style={styles.modalEyebrow}>DATOS DEL LOCAL</Text>
                <Text style={styles.modalTitle}>
                  {editingBranch ? 'Editar Sucursal' : 'Registrar Nueva Sucursal Bola8'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setFormVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formBody}>
              <FormField
                label="Nombre de la Sucursal *"
                placeholder="Ej. Sucursal Quillacollo"
                value={form.nombre}
                onChangeText={(nombre) => setForm((current) => ({ ...current, nombre }))}
                maxLength={100}
              />
              <FormField
                label="Dirección Física"
                placeholder="Ej. Av. Blanco Galindo Km 12"
                value={form.direccion}
                onChangeText={(direccion) => setForm((current) => ({ ...current, direccion }))}
                maxLength={255}
              />
              <FormField
                label="Teléfono de Contacto"
                placeholder="Ej. 4-4321987"
                value={form.telefono}
                onChangeText={(telefono) => setForm((current) => ({ ...current, telefono }))}
                keyboardType="phone-pad"
                maxLength={30}
              />
              <Text style={styles.hint}>Los campos con * son obligatorios.</Text>
              {formError ? (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setFormVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => { void saveBranch(); }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}
              >
                {saving
                  ? <ActivityIndicator color={colors.background} size="small" />
                  : <Text style={styles.primaryText}>{editingBranch ? 'Guardar cambios' : 'Crear Sucursal'}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!deactivating) setBranchToDeactivate(null);
        }}
        transparent
        visible={Boolean(branchToDeactivate)}
      >
        <View style={styles.modalLayer}>
          <View accessibilityRole="alert" style={[styles.confirmModal, shadows]}>
            <Text style={styles.modalEyebrow}>CONFIRMAR ACCIÓN</Text>
            <Text style={styles.modalTitle}>Desactivar sucursal</Text>
            <Text style={styles.confirmMessage}>
              {branchToDeactivate
                ? `¿Desactivar “${branchToDeactivate.nombre}”? La sucursal dejará de aparecer en la operación diaria, pero sus registros históricos se conservarán.`
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={deactivating}
                onPress={() => setBranchToDeactivate(null)}
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
                  ? <ActivityIndicator color={colors.text} size="small" />
                  : <Text style={styles.dangerText}>Desactivar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({
  label,
  keyboardType,
  ...props
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="sentences"
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={styles.input}
        {...props}
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

  headerCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 16,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerTopCompact: { flexDirection: 'column', alignItems: 'stretch' },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  primaryButton: {
    minHeight: 42,
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
  disabled: { opacity: 0.55 },

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

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusError: { borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: colors.dangerSoft },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  statusMessage: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  statusText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  statusAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  statusActionText: { color: colors.accent, fontSize: 11, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  branchCard: {
    flexGrow: 1,
    flexBasis: 330,
    minWidth: 0,
    justifyContent: 'space-between',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  branchCardSelected: { borderColor: 'rgba(16, 185, 129, 0.6)' },
  branchCardCompact: { flexBasis: '100%' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  branchName: { flex: 1, minWidth: 0, color: colors.text, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  activeText: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  contactText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 16 },

  statsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  statCell: { flex: 1, minWidth: 0 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  statLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  statIncome: { color: colors.accent, fontSize: 13 },

  openButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  openButtonDefault: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  openButtonSelected: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.45)' },
  openButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  openButtonTextSelected: { color: colors.accent },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 11,
    borderTopWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.7)',
  },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 4 },
  cardActionText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  cardActionDanger: { paddingHorizontal: 8, borderRadius: 7, backgroundColor: colors.dangerSoft },
  cardActionDangerText: { color: colors.danger },

  footerNote: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },

  modalLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
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
  field: { gap: 7 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  input: {
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
