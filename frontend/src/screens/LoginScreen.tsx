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
import { login, registerAdminGeneral, type AuthUser } from '../services/auth';
import { setAccessToken } from '../services/api';
import { colors, shadows } from '../theme';

type Props = {
  onLogin: (user: AuthUser) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (registering) {
      if (!nombre.trim() || !identifier.trim() || !password) {
        setError('Completa tu nombre, correo y contraseña.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    } else if (!identifier.trim() || !password) {
      setError('Ingresa tu usuario o correo y contraseña.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = registering
        ? await registerAdminGeneral({ nombre: nombre.trim(), email: identifier.trim(), password })
        : await login(identifier.trim(), password);
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
        <Text style={styles.subtitle}>{registering ? 'Crear cuenta de administrador general' : 'Inicia sesión para continuar'}</Text>

        {registering ? (
          <View style={styles.field}>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <TextInput
              accessibilityLabel="Nombre completo"
              autoComplete="name"
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={nombre}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>{registering ? 'CORREO ELECTRÓNICO' : 'USUARIO O CORREO'}</Text>
          <TextInput
            accessibilityLabel={registering ? 'Correo electrónico' : 'Nombre de usuario o correo electrónico'}
            autoCapitalize="none"
            autoComplete={registering ? 'email' : 'username'}
            keyboardType={registering ? 'email-address' : 'default'}
            onChangeText={setIdentifier}
            onSubmitEditing={submit}
            placeholder={registering ? 'nombre@dominio.com' : 'usuario o correo@dominio.com'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={identifier}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{registering ? 'CONTRASEÑA (MÍNIMO 12 CARACTERES)' : 'CONTRASEÑA'}</Text>
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

        {registering ? (
          <View style={styles.field}>
            <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
            <TextInput
              accessibilityLabel="Confirmar contraseña"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              onSubmitEditing={submit}
              placeholder="Repite la contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>
        ) : null}

        {registering ? (
          <Text style={styles.registrationNotice}>
            El registro público solo está disponible para crear el primer administrador general. Después, el administrador crea las cuentas de sucursal.
          </Text>
        ) : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting || !identifier.trim() || !password || (registering && (!nombre.trim() || !confirmPassword))}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            (submitting || !identifier.trim() || !password || (registering && (!nombre.trim() || !confirmPassword))) && styles.disabled,
          ]}
        >
          {submitting
            ? <ActivityIndicator color="#04130d" size="small" />
            : <Text style={styles.buttonText}>{registering ? 'Crear administrador' : 'Iniciar sesión'}</Text>}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => {
            setRegistering((current) => !current);
            setError('');
          }}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            {registering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Registrar administrador'}
          </Text>
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
  registrationNotice: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  linkButton: { alignItems: 'center', paddingTop: 16 },
  linkText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
