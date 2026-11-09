import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login, type AuthUser } from '../services/auth';
import { setAccessToken } from '../services/api';
import { colors, shadows } from '../theme';

type Props = {
  onLogin: (user: AuthUser) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await login(email.trim(), password);
      setAccessToken(result.token);
      onLogin(result.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.logo}><Text style={styles.logoText}>8</Text></View>
        <Text style={styles.brand}>BOLA<Text style={styles.brandAccent}>8</Text></Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

        <View style={styles.field}>
          <Text style={styles.label}>CORREO</Text>
          <TextInput
            accessibilityLabel="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={submit}
            placeholder="nombre@bola8.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput
            accessibilityLabel="Contraseña"
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="Contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting || !email.trim() || !password}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            (submitting || !email.trim() || !password) && styles.disabled,
          ]}
        >
          {submitting
            ? <ActivityIndicator color="#04130d" size="small" />
            : <Text style={styles.buttonText}>Iniciar sesión</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows || {}),
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  logoText: { color: '#04130d', fontSize: 28, fontWeight: '900' },
  brand: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  brandAccent: { color: colors.accent },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7 },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    minHeight: 46,
    paddingHorizontal: 13,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  button: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#04130d', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
