import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Branch } from '../services/products';
import { colors } from '../theme';

type BranchPickerProps = {
  branches: Branch[];
  selectedBranchId: string;
  onSelect: (branchId: string) => void;
};

export function BranchPicker({ branches, selectedBranchId, onSelect }: BranchPickerProps) {
  const [visible, setVisible] = useState(false);
  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === selectedBranchId);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar sucursal"
        disabled={!branches.length}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed, !branches.length && styles.disabled]}
      >
        <View style={styles.copy}>
          <Text style={styles.label}>SUCURSAL</Text>
          <Text numberOfLines={1} style={styles.value}>{selectedBranch?.nombre || 'Sin sucursales disponibles'}</Text>
        </View>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>Seleccionar sucursal</Text>
            <ScrollView style={styles.list}>
              {branches.map((branch) => {
                const active = String(branch.id_sucursal) === selectedBranchId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={String(branch.id_sucursal)}
                    onPress={() => {
                      onSelect(String(branch.id_sucursal));
                      setVisible(false);
                    }}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{branch.nombre}</Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 210,
    maxWidth: 360,
    minHeight: 54,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.58 },
  copy: { flex: 1 },
  label: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  value: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  chevron: { color: colors.accent, fontSize: 22, fontWeight: '700', marginTop: -7 },
  backdrop: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  list: { flexGrow: 0 },
  option: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionActive: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  optionTextActive: { color: colors.accent },
  check: { color: colors.accent, fontWeight: '800' },
  closeButton: { alignSelf: 'flex-end', marginTop: 14, paddingVertical: 9, paddingHorizontal: 12 },
  closeText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
});
