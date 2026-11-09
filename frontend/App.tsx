import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import SalesScreen from './src/screens/SalesScreen';
import TablesScreen from './src/screens/TablesScreen';
import UsersScreen from './src/screens/UsersScreen';
import { setAccessToken } from './src/services/api';
import type { AuthUser } from './src/services/auth';
import { colors } from './src/theme';

export default function App() {
  const [screen, setScreen] = useState<'productos' | 'mesas' | 'caja' | 'reservas' | 'usuarios'>('mesas');
  const [user, setUser] = useState<AuthUser | null>(null);

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={(authenticatedUser) => {
          setUser(authenticatedUser);
          setScreen('mesas');
        }} />
      </>
    );
  }

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setScreen('mesas');
  };

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.accountBar}>
          <Text style={styles.accountText}>{user.nombre} · {user.rol.replace('_', ' ')}</Text>
          <Pressable accessibilityRole="button" onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen('productos')}
            style={({ pressed }) => [styles.tab, screen === 'productos' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, screen === 'productos' && styles.tabTextActive]}>Productos</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen('mesas')}
            style={({ pressed }) => [styles.tab, screen === 'mesas' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, screen === 'mesas' && styles.tabTextActive]}>Mesas</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen('caja')}
            style={({ pressed }) => [styles.tab, screen === 'caja' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, screen === 'caja' && styles.tabTextActive]}>Caja</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen('reservas')}
            style={({ pressed }) => [styles.tab, screen === 'reservas' && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, screen === 'reservas' && styles.tabTextActive]}>Reservas</Text>
          </Pressable>
          {user.rol === 'admin_general' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setScreen('usuarios')}
              style={({ pressed }) => [styles.tab, screen === 'usuarios' && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabText, screen === 'usuarios' && styles.tabTextActive]}>Usuarios</Text>
            </Pressable>
          ) : null}
        </View>

        {screen === 'productos'
          ? <ProductsScreen user={user} />
          : screen === 'mesas'
            ? <TablesScreen user={user} />
            : screen === 'caja'
              ? <SalesScreen user={user} />
              : screen === 'reservas'
                ? <ReservationsScreen />
                : <UsersScreen />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  accountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  accountText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 10 },
  logoutText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '800', fontSize: 13 },
  tabTextActive: { color: colors.accent },
  pressed: { opacity: 0.85 },
});
