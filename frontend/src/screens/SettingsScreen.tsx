import { useEffect, useState } from 'react';
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
import { Moon, Printer, Save, Settings as SettingsIcon, Sun } from 'lucide-react-native';
import { OptionPicker } from '../components/OptionPicker';
import { ApiError } from '../services/api';
import {
  updateSettings,
  type PrintFormat,
  type SettingsCurrency,
  type SettingsLanguage,
  type SettingsTheme,
  type UserSettings,
} from '../services/settings';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

type SettingsForm = {
  tema: SettingsTheme;
  idioma: SettingsLanguage;
  moneda: SettingsCurrency;
  nombre_comercial: string;
  iva_porcentaje: string;
  formato_impresion: PrintFormat;
};

const themeOptions: Array<{ value: SettingsTheme; label: string }> = [
  { value: 'dark', label: 'Oscuro Lounge' },
  { value: 'light', label: 'Claro Ejecutivo' },
];

const languageOptions = [
  { value: 'es', label: 'Español (Latinoamérica)' },
  { value: 'en', label: 'English (International)', disabled: true },
];

const currencyOptions = [
  { value: 'BOB', label: 'Bolivianos (Bs.) — Base 1.00' },
  { value: 'USD', label: 'Dólares Americanos (USD $)', disabled: true },
  { value: 'EUR', label: 'Euros (EUR €)', disabled: true },
];

const printOptions: Array<{ value: PrintFormat; label: string }> = [
  { value: '80mm', label: 'Ticket 80mm' },
  { value: 'A4', label: 'Hoja A4' },
];

function toForm(settings: UserSettings): SettingsForm {
  return {
    tema: settings.tema,
    idioma: settings.idioma,
    moneda: settings.moneda,
    nombre_comercial: settings.nombre_comercial,
    iva_porcentaje: String(settings.iva_porcentaje),
    formato_impresion: settings.formato_impresion,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Revisa la conexión con el servidor antes de guardar.`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'No se pudo guardar la configuración.';
}

type SettingsScreenProps = {
  settings: UserSettings | null;
  onSaved: (settings: UserSettings) => void;
};

export default function SettingsScreen({ settings, onSaved }: SettingsScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [form, setForm] = useState<SettingsForm | null>(settings ? toForm(settings) : null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setForm(toForm(settings));
  }, [settings]);

  if (!form) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Cargando configuración…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const nombreComercial = form.nombre_comercial.trim();
    const iva = Number(form.iva_porcentaje.replace(',', '.'));

    if (!nombreComercial || nombreComercial.length > 120) {
      setFormError('El nombre comercial es obligatorio y admite hasta 120 caracteres.');
      return;
    }
    if (!Number.isFinite(iva) || iva < 0 || iva > 30) {
      setFormError('El IVA debe ser un número entre 0 y 30.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const saved = await updateSettings({
        tema: form.tema,
        idioma: form.idioma,
        moneda: form.moneda,
        nombre_comercial: nombreComercial,
        iva_porcentaje: iva,
        formato_impresion: form.formato_impresion,
      });
      setForm(toForm(saved));
      onSaved(saved);
      setNotice({ kind: 'success', text: 'Configuración guardada y aplicada.' });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
        <View style={[styles.panel, shadows]}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <SettingsIcon color={colors.accent} size={20} />
              <Text style={styles.panelTitle}>Configuración del Sistema</Text>
            </View>
            <Text style={styles.panelSubtitle}>
              Preferencias de tu cuenta de Bola8. Se guardan en la base de datos y se aplican a tus comprobantes.
            </Text>
          </View>

          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Apariencia / Tema</Text>
              <View style={styles.themeRow}>
                {themeOptions.map((option) => {
                  const active = form.tema === option.value;
                  const supported = option.value === 'dark';
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, disabled: !supported }}
                      disabled={!supported}
                      key={option.value}
                      onPress={() => setForm((current) => (current ? { ...current, tema: option.value } : current))}
                      style={({ pressed }) => [
                        styles.themeButton,
                        active ? styles.themeButtonActive : styles.themeButtonInactive,
                        pressed && styles.pressed,
                        !supported && styles.disabled,
                      ]}
                    >
                      {option.value === 'dark'
                        ? <Moon color={active ? colors.accent : colors.textMuted} size={15} />
                        : <Sun color={colors.textMuted} size={15} />}
                      <Text style={[styles.themeButtonText, active ? styles.themeButtonTextActive : styles.themeButtonTextIdle]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                El cliente Expo se entrega con el tema “Oscuro Lounge”. El tema claro ejecutivo todavía no está disponible.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Idioma de Interfaz</Text>
              <OptionPicker
                label="Idioma de Interfaz"
                onSelect={(value) => setForm((current) => (
                  current ? { ...current, idioma: value as SettingsLanguage } : current
                ))}
                options={languageOptions}
                value={form.idioma}
              />
              <Text style={styles.hint}>
                La interfaz del sistema está disponible en español; la versión en inglés se habilitará más adelante.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Moneda del Sistema</Text>
              <OptionPicker
                label="Moneda del Sistema"
                onSelect={(value) => setForm((current) => (
                  current ? { ...current, moneda: value as SettingsCurrency } : current
                ))}
                options={currencyOptions}
                value={form.moneda}
              />
              <Text style={styles.hint}>
                Los importes se registran en bolivianos (Bs.). No hay tasa de cambio configurada, por eso no se
                convierten a otras monedas.
              </Text>
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionLabel}>Facturación y Ticket PDF</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nombre Comercial en Ticket</Text>
                <TextInput
                  accessibilityLabel="Nombre Comercial en Ticket"
                  autoCapitalize="characters"
                  maxLength={120}
                  onChangeText={(value) => setForm((current) => (
                    current ? { ...current, nombre_comercial: value } : current
                  ))}
                  placeholder="SALÓN DE BILLAR BOLA8"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  style={styles.input}
                  value={form.nombre_comercial}
                />
                <Text style={styles.hint}>Encabezado que se imprime en los comprobantes de venta.</Text>
              </View>

              <View style={styles.inlineRow}>
                <View style={styles.inlineColumn}>
                  <Text style={styles.fieldLabel}>IVA / Impuesto (%)</Text>
                  <TextInput
                    accessibilityLabel="IVA / Impuesto"
                    keyboardType="decimal-pad"
                    maxLength={5}
                    onChangeText={(value) => setForm((current) => (
                      current ? { ...current, iva_porcentaje: value } : current
                    ))}
                    placeholder="13"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    style={styles.input}
                    value={form.iva_porcentaje}
                  />
                </View>
                <View style={styles.inlineColumn}>
                  <Text style={styles.fieldLabel}>Formato Impresión</Text>
                  <OptionPicker
                    label="Formato Impresión"
                    onSelect={(value) => setForm((current) => (
                      current ? { ...current, formato_impresion: value as PrintFormat } : current
                    ))}
                    options={printOptions}
                    value={form.formato_impresion}
                  />
                </View>
              </View>

              <Text style={styles.hint}>
                El IVA queda declarado como parámetro del salón: el sistema no recalcula impuestos sobre los precios
                del catálogo. El formato de impresión sí se aplica al generar el comprobante.
              </Text>
            </View>

            {notice ? (
              <View style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeSuccess]}>
                <Text style={[styles.noticeText, notice.kind === 'error' ? styles.noticeErrorText : styles.noticeSuccessText]}>
                  {notice.text}
                </Text>
              </View>
            ) : null}

            {formError ? (
              <View accessibilityRole="alert" style={[styles.notice, styles.noticeError]}>
                <Text style={[styles.noticeText, styles.noticeErrorText]}>{formError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.panelFooter}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => { void save(); }}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}
            >
              {saving
                ? <ActivityIndicator color={colors.background} size="small" />
                : (
                  <>
                    <Save color={colors.background} size={15} strokeWidth={2.6} />
                    <Text style={styles.saveText}>Guardar y Aplicar Cambios</Text>
                  </>
                )}
            </Pressable>
            <View style={styles.footerMeta}>
              <Printer color={colors.textMuted} size={12} />
              <Text style={styles.footerMetaText}>
                Los comprobantes se imprimen con el nombre y el formato configurados aquí.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  wrapper: {
    flex: 1,
    padding: 22,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  wrapperCompact: { padding: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.textMuted, fontSize: 12 },

  panel: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  panelTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  panelSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },

  panelScroll: { flexShrink: 1 },
  panelBody: { padding: 18, gap: 20 },
  section: { gap: 10 },
  sectionDivider: {
    gap: 14,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  themeRow: { flexDirection: 'row', gap: 10 },
  themeButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeButtonActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  themeButtonInactive: { borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  themeButtonText: { fontSize: 11, fontWeight: '800' },
  themeButtonTextActive: { color: colors.accent },
  themeButtonTextIdle: { color: colors.textMuted, fontWeight: '700' },

  field: { gap: 7 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 12,
  },
  inlineRow: { flexDirection: 'row', gap: 10 },
  inlineColumn: { flex: 1, minWidth: 0, gap: 7 },
  hint: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },

  notice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
  },
  noticeSuccess: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  noticeText: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  noticeSuccessText: { color: colors.accent },
  noticeErrorText: { color: colors.danger },

  panelFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  saveButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  saveText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerMetaText: { flex: 1, color: colors.textMuted, fontSize: 10, lineHeight: 14 },

  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
});
