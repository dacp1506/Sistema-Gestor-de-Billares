import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { colors } from '../theme';

export type OptionPickerOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type OptionPickerProps = {
  label: string;
  value: string;
  options: OptionPickerOption[];
  placeholder?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
};

export function OptionPicker({
  label,
  value,
  options,
  placeholder = 'Seleccionar',
  disabled = false,
  onSelect,
}: OptionPickerProps) {
  const [visible, setVisible] = useState(false);
  useAccessibleModal(visible, () => setVisible(false));
  const selected = options.find((option) => option.value === value);
  const isDisabled = disabled || !options.length;

  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label || placeholder}
        </Text>
        <ChevronDown color={colors.accent} size={17} />
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>{label}</Text>
            <ScrollView style={styles.list}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: option.disabled }}
                    disabled={option.disabled}
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setVisible(false);
                    }}
                    style={[styles.option, active && styles.optionActive, option.disabled && styles.disabled]}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
                      {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.closeButton}>
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
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  placeholder: { color: colors.textMuted, fontWeight: '500' },
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
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionActive: { backgroundColor: colors.accentSoft },
  optionCopy: { flex: 1, minWidth: 0 },
  optionLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  optionLabelActive: { color: colors.accent, fontWeight: '800' },
  optionDescription: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  check: { color: colors.accent, fontWeight: '800' },
  closeButton: { alignSelf: 'flex-end', marginTop: 14, paddingVertical: 9, paddingHorizontal: 12 },
  closeText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
});
