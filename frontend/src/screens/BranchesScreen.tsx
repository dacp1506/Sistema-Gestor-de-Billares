import { useCallback, useEffect, useState } from 'react';
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
import { Building2, MapPin, Pencil, Phone, Plus, X } from 'lucide-react-native';
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

const emptyForm = (): BranchForm => ({ nombre: '', direccion: '', telefono: '' });

export default function BranchesScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
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
      setError(loadError instanceof ApiError || loadError instanceof Error
        ? loadError.message
        : 'No se pudieron cargar las sucursales.');
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
        setNotice({ kind: 'success', text: `Sucursal “${nombre}” actualizada.` });
      } else {
        await createBranch(input);
        setNotice({ kind: 'success', text: `Sucursal “${nombre}” registrada.` });
      }
      setFormVisible(false);
      await loadBranches();
    } catch (saveError) {
      setFormError(saveError instanceof ApiError || saveError instanceof Error
        ? saveError.message
        : 'No se pudo guardar la sucursal.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!branchToDeactivate) return;
    setDeactivating(true);
    setError(null);
    try {
      await deactivateBranch(branchToDeactivate.id_sucursal);
      setNotice({ kind: 'success', text: `Sucursal “${branchToDeactivate.nombre}” desactivada.` });
      setBranchToDeactivate(null);
      await loadBranches();
    } catch (deactivateError) {
      setError(deactivateError instanceof ApiError || deactivateError instanceof Error
        ? deactivateError.message
        : 'No se pudo desactivar la sucursal.');
      setBranchToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN · CADENA</Text>
            <Text style={styles.title}>Sucursales</Text>
            <Text style={styles.subtitle}>Administra los locales y sus datos de contacto.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openCreate}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Plus color="#04130d" size={17} />
            <Text style={styles.primaryText}>Nueva sucursal</Text>
          </Pressable>
        </View>

        {notice ? (
          <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
            <Pressable accessibilityLabel="Descartar aviso" accessibilityRole="button" onPress={() => setNotice(null)}>
              <X color={notice.kind === 'success' ? colors.accent : colors.danger} size={16} />
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.status}><ActivityIndicator color={colors.accent} /><Text style={styles.statusText}>Cargando sucursales…</Text></View>
        ) : error ? (
          <View style={[styles.status, styles.errorCard]}>
            <Text style={styles.errorTitle}>No se pudieron cargar las sucursales</Text>
            <Text style={styles.statusText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadBranches(); }} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : branches.length === 0 ? (
          <View style={styles.status}>
            <Building2 color={colors.textMuted} size={28} />
            <Text style={styles.statusText}>Todavía no hay sucursales activas.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>LOCALES ACTIVOS</Text>
              <Text style={styles.summaryValue}>{branches.length}</Text>
            </View>
            <View style={[styles.branchGrid, compact && styles.branchGridCompact]}>
              {branches.map((branch) => (
                <View key={String(branch.id_sucursal)} style={styles.branchCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.branchIcon}><Building2 color={colors.accent} size={19} /></View>
                    <View style={styles.branchIdentity}>
                      <Text numberOfLines={2} style={styles.branchName}>{branch.nombre}</Text>
                      <Text style={styles.branchId}>Sucursal #{branch.id_sucursal}</Text>
                    </View>
                    <View style={styles.activeBadge}><Text style={styles.activeText}>ACTIVA</Text></View>
                  </View>
                  <View style={styles.contactRow}>
                    <MapPin color={colors.textMuted} size={15} />
                    <Text style={styles.contactText}>{branch.direccion || 'Dirección no registrada'}</Text>
                  </View>
                  <View style={styles.contactRow}>
                    <Phone color={colors.textMuted} size={15} />
                    <Text style={styles.contactText}>{branch.telefono || 'Teléfono no registrado'}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable accessibilityRole="button" onPress={() => openEdit(branch)} style={styles.editButton}>
                      <Pencil color={colors.info} size={14} />
                      <Text style={styles.editText}>Editar datos</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => setBranchToDeactivate(branch)} style={styles.deactivateButton}>
                      <Text style={styles.deactivateText}>Desactivar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
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
        <View style={styles.modalLayer}>
          <Pressable
            accessibilityLabel="Cerrar formulario"
            onPress={() => {
              if (!saving) setFormVisible(false);
            }}
            style={styles.backdrop}
          />
          <View accessibilityViewIsModal style={styles.modal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>DATOS DEL LOCAL</Text>
                <Text style={styles.modalTitle}>{editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}</Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" disabled={saving} onPress={() => setFormVisible(false)} style={styles.closeButton}>
                <X color={colors.textMuted} size={19} />
              </Pressable>
            </View>
            <ScrollView style={styles.formBody}>
              <FormField
                label="NOMBRE"
                placeholder="Ej. Bola8 Centro"
                value={form.nombre}
                onChangeText={(nombre) => setForm((current) => ({ ...current, nombre }))}
                maxLength={100}
              />
              <FormField
                label="DIRECCIÓN"
                placeholder="Dirección del local"
                value={form.direccion}
                onChangeText={(direccion) => setForm((current) => ({ ...current, direccion }))}
                maxLength={255}
              />
              <FormField
                label="TELÉFONO"
                placeholder="Teléfono de contacto"
                value={form.telefono}
                onChangeText={(telefono) => setForm((current) => ({ ...current, telefono }))}
                keyboardType="phone-pad"
                maxLength={30}
              />
              {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setFormVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void saveBranch(); }} style={[styles.primaryButton, saving && styles.disabled]}>
                {saving ? <ActivityIndicator color="#04130d" size="small" /> : <Text style={styles.primaryText}>{editingBranch ? 'Guardar cambios' : 'Registrar'}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!deactivating) setBranchToDeactivate(null);
        }}
        transparent
        visible={Boolean(branchToDeactivate)}
      >
        {branchToDeactivate ? (
          <View style={styles.modalLayer}>
            <Pressable
              accessibilityLabel="Cancelar desactivación"
              onPress={() => {
                if (!deactivating) setBranchToDeactivate(null);
              }}
              style={styles.backdrop}
            />
            <View accessibilityViewIsModal style={styles.confirmModal}>
              <Text style={styles.modalEyebrow}>CONFIRMAR ACCIÓN</Text>
              <Text style={styles.modalTitle}>Desactivar sucursal</Text>
              <Text style={styles.confirmMessage}>
                ¿Desactivar “{branchToDeactivate.nombre}”? Se conservarán sus registros históricos.
              </Text>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" disabled={deactivating} onPress={() => setBranchToDeactivate(null)} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={deactivating} onPress={() => { void confirmDeactivate(); }} style={[styles.dangerButton, deactivating && styles.disabled]}>
                  {deactivating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dangerText}>Desactivar</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
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
        accessibilityLabel={label.toLocaleLowerCase()}
        autoCapitalize="sentences"
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15 },
  headerCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  heading: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 5, lineHeight: 18 },
  primaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  primaryText: { color: '#04130d', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.56 },
  notice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  noticeSuccess: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  status: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 11, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  statusText: { color: colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  errorCard: { borderColor: 'rgba(251, 113, 133, 0.35)' },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  retryButton: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8, backgroundColor: colors.accentSoft },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  summary: { minHeight: 70, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  summaryLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  summaryValue: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 3 },
  branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  branchGridCompact: { flexDirection: 'column' },
  branchCard: { flexGrow: 1, flexBasis: 340, minWidth: 0, padding: 17, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...(shadows || {}) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  branchIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.accentSoft },
  branchIdentity: { flex: 1, minWidth: 0 },
  branchName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  branchId: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  activeBadge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, backgroundColor: colors.accentSoft },
  activeText: { color: colors.accent, fontSize: 9, fontWeight: '900' },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 10 },
  contactText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 7, paddingTop: 13, borderTopWidth: 1, borderColor: colors.border },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7 },
  editText: { color: colors.info, fontSize: 11, fontWeight: '800' },
  deactivateButton: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8, backgroundColor: colors.dangerSoft },
  deactivateText: { color: colors.danger, fontSize: 10, fontWeight: '800' },
  modalLayer: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2, 6, 23, 0.78)' },
  modal: { width: '100%', maxWidth: 520, maxHeight: '90%', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...(shadows || {}) },
  confirmModal: { width: '100%', maxWidth: 420, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...(shadows || {}) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.border },
  modalEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: colors.surfaceRaised },
  formBody: { flexGrow: 0 },
  field: { marginTop: 15 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 7 },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, color: colors.text, fontSize: 13 },
  formError: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, paddingTop: 14, marginTop: 15, borderTopWidth: 1, borderColor: colors.border },
  cancelButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  dangerButton: { minHeight: 40, minWidth: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.danger },
  dangerText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  confirmMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
