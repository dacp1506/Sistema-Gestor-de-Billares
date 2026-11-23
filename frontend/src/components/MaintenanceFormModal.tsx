import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { OptionPicker } from './OptionPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import type {
  MaintenanceEquipment,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestInput,
} from '../services/maintenance';
import { colors } from '../theme';

type MaintenanceFormModalProps = {
  visible: boolean;
  request: MaintenanceRequest | null;
  equipment: MaintenanceEquipment[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: MaintenanceRequestInput) => void;
};

type FormValues = {
  id_equipo: string;
  solicitante: string;
  descripcion: string;
  prioridad: MaintenancePriority;
};

const emptyValues: FormValues = {
  id_equipo: '',
  solicitante: '',
  descripcion: '',
  prioridad: 'MEDIA',
};

const PRIORITY_OPTIONS = [
  { value: 'BAJA', label: 'Baja', description: 'Puede esperar al próximo mantenimiento' },
  { value: 'MEDIA', label: 'Media', description: 'Debe atenderse durante la jornada' },
  { value: 'ALTA', label: 'Alta', description: 'Afecta la operación del salón' },
];

export function MaintenanceFormModal({
  visible,
  request,
  equipment,
  saving,
  error,
  onClose,
  onSave,
}: MaintenanceFormModalProps) {
  useAccessibleModal(visible, onClose);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setValidationError(null);
    setValues(request
      ? {
          id_equipo: String(request.id_equipo),
          solicitante: request.solicitante,
          descripcion: request.descripcion,
          prioridad: request.prioridad,
        }
      : emptyValues);
  }, [request, visible]);

  const equipmentOptions = useMemo(
    () => equipment.map((item) => ({
      value: String(item.id_equipo),
      label: `${item.codigo} · ${item.nombre}`,
      description: item.ubicacion,
    })),
    [equipment],
  );

  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  };

  const submit = () => {
    const solicitante = values.solicitante.trim();
    const descripcion = values.descripcion.trim();

    if (!values.id_equipo) return setValidationError('Selecciona un equipo operativo.');
    if (solicitante.length < 3) {
      return setValidationError('El solicitante es obligatorio y debe tener al menos 3 caracteres.');
    }
    if (solicitante.length > 120) {
      return setValidationError('El solicitante admite hasta 120 caracteres.');
    }
    if (descripcion.length < 10) {
      return setValidationError('La descripción es obligatoria y debe tener al menos 10 caracteres.');
    }
    if (descripcion.length > 2000) {
      return setValidationError('La descripción admite hasta 2000 caracteres.');
    }

    onSave({
      id_equipo: Number(values.id_equipo),
      solicitante,
      descripcion,
      prioridad: values.prioridad,
    });
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>MANTENIMIENTO · BOLA8</Text>
              <Text style={styles.title}>{request ? 'Editar solicitud' : 'Nueva solicitud'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.label}>Equipo operativo *</Text>
              <OptionPicker
                disabled={saving || !equipmentOptions.length}
                label="Equipo operativo"
                onSelect={(value) => setField('id_equipo', value)}
                options={equipmentOptions}
                placeholder={equipmentOptions.length ? 'Seleccionar equipo' : 'Sin equipos operativos'}
                value={values.id_equipo}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Solicitante *</Text>
              <TextInput
                accessibilityLabel="Solicitante"
                editable={!saving}
                maxLength={120}
                onChangeText={(text) => setField('solicitante', text)}
                placeholder="Nombre del encargado o cliente"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                style={styles.input}
                value={values.solicitante}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descripción del problema *</Text>
              <TextInput
                accessibilityLabel="Descripción del problema"
                editable={!saving}
                maxLength={2000}
                multiline
                numberOfLines={4}
                onChangeText={(text) => setField('descripcion', text)}
                placeholder="Describe la falla con el mayor detalle posible (mínimo 10 caracteres)"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                style={[styles.input, styles.multiline]}
                textAlignVertical="top"
                value={values.descripcion}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Prioridad *</Text>
              <OptionPicker
                disabled={saving}
                label="Prioridad"
                onSelect={(value) => setField('prioridad', value as MaintenancePriority)}
                options={PRIORITY_OPTIONS}
                value={values.prioridad}
              />
            </View>

            <Text style={styles.hint}>
              Los campos con * son obligatorios. Toda solicitud nueva se registra como PENDIENTE
              y el código se genera automáticamente en el servidor.
            </Text>

            {(validationError || error) ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{validationError || error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving || !equipmentOptions.length}
              onPress={submit}
              style={({ pressed }) => [
                styles.save,
                pressed && styles.pressed,
                (saving || !equipmentOptions.length) && styles.disabled,
              ]}
            >
              {saving ? <ActivityIndicator color={colors.background} size="small" /> : (
                <Text style={styles.saveText}>{request ? 'Guardar cambios' : 'Registrar solicitud'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  dialog: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 5 },
  close: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 28 },
  fields: { gap: 14, paddingBottom: 6 },
  field: { gap: 7 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  input: {
    width: '100%',
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { minHeight: 104 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  errorBox: { padding: 11, backgroundColor: colors.dangerSoft, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)' },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancel: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: colors.surfaceRaised },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  save: { minHeight: 44, minWidth: 150, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: colors.accent },
  saveText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.62 },
});
