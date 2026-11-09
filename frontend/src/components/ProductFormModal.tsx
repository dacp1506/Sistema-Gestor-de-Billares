import { useEffect, useState } from 'react';
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
import type { Product, ProductInput } from '../services/products';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { colors } from '../theme';

type ProductFormModalProps = {
  visible: boolean;
  branchId: number;
  product: Product | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (product: ProductInput) => void;
};

type FormValues = {
  nombre: string;
  categoria: string;
  precio_venta: string;
  stock: string;
  stock_minimo: string;
};

const emptyValues: FormValues = {
  nombre: '',
  categoria: '',
  precio_venta: '',
  stock: '',
  stock_minimo: '0',
};

export function ProductFormModal({
  visible,
  branchId,
  product,
  saving,
  error,
  onClose,
  onSave,
}: ProductFormModalProps) {
  useAccessibleModal(visible, onClose);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setValidationError(null);
    setValues(product
      ? {
          nombre: product.nombre,
          categoria: product.categoria || '',
          precio_venta: String(product.precio_venta),
          stock: String(product.stock),
          stock_minimo: String(product.stock_minimo),
        }
      : emptyValues);
  }, [product, visible]);

  const setField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  };

  const submit = () => {
    const name = values.nombre.trim();
    const price = Number(values.precio_venta.replace(',', '.'));
    const stock = Number(values.stock);
    const minimum = Number(values.stock_minimo);

    if (!name) return setValidationError('Ingresa el nombre del producto.');
    if (name.length > 120) return setValidationError('El nombre admite hasta 120 caracteres.');
    if (!values.precio_venta.trim() || !Number.isFinite(price) || price < 0) {
      return setValidationError('Ingresa un precio válido igual o mayor que cero.');
    }
    if (!/^\d+$/.test(values.stock) || !Number.isSafeInteger(stock)) {
      return setValidationError('El stock debe ser un número entero igual o mayor que cero.');
    }
    if (!/^\d+$/.test(values.stock_minimo) || !Number.isSafeInteger(minimum)) {
      return setValidationError('El stock mínimo debe ser un número entero igual o mayor que cero.');
    }
    const category = values.categoria.trim();
    if (category.length > 80) return setValidationError('La categoría admite hasta 80 caracteres.');

    onSave({
      nombre: name,
      precio_venta: price,
      stock,
      stock_minimo: minimum,
      id_sucursal: branchId,
      categoria: category || null,
    });
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.dialog}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.eyebrow}>INVENTARIO LOCAL</Text>
              <Text style={styles.title}>{product ? 'Editar producto' : 'Nuevo producto'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.fields}>
            <Field label="Nombre *" value={values.nombre} onChangeText={(text) => setField('nombre', text)} placeholder="Ej. Coca-Cola 2L" maxLength={120} />
            <Field label="Categoría" value={values.categoria} onChangeText={(text) => setField('categoria', text)} placeholder="Ej. Bebidas" maxLength={80} />
            <View style={styles.row}>
              <Field label="Precio de venta *" value={values.precio_venta} onChangeText={(text) => setField('precio_venta', text)} placeholder="0.00" keyboardType="decimal-pad" />
              <Field label="Stock actual *" value={values.stock} onChangeText={(text) => setField('stock', text)} placeholder="0" keyboardType="number-pad" />
            </View>
            <Field label="Alerta de stock bajo" value={values.stock_minimo} onChangeText={(text) => setField('stock_minimo', text)} placeholder="0" keyboardType="number-pad" />
            <Text style={styles.hint}>Los campos con * son obligatorios. El precio se guarda en bolivianos (Bs.).</Text>
            {(validationError || error) && (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{validationError || error}</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={submit}
              style={({ pressed }) => [styles.save, pressed && styles.pressed, saving && styles.disabled]}
            >
              {saving ? <ActivityIndicator color={colors.background} size="small" /> : (
                <Text style={styles.saveText}>{product ? 'Guardar cambios' : 'Guardar producto'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  maxLength?: number;
};

function Field({ label, keyboardType = 'default', ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        autoCapitalize="sentences"
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={styles.input}
      />
    </View>
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
    maxWidth: 560,
    maxHeight: '92%',
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 5 },
  close: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 28 },
  fields: { gap: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 7 },
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
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  errorBox: { padding: 11, backgroundColor: colors.dangerSoft, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)' },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancel: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: colors.surfaceRaised },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  save: { minHeight: 44, minWidth: 142, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: colors.accent },
  saveText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.62 },
});
