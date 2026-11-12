import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Building2,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sliders,
  Wallet,
  ChartNoAxesCombined,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import LoginScreen from './src/screens/LoginScreen';
import BranchesScreen from './src/screens/BranchesScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PosScreen from './src/screens/PosScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import ArqueoScreen from './src/screens/ArqueoScreen';
import TablesScreen from './src/screens/TablesScreen';
import UsersScreen from './src/screens/UsersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useAccessibleModal } from './src/hooks/useAccessibleModal';
import { setAccessToken } from './src/services/api';
import type { AuthUser } from './src/services/auth';
import { clearPosCarts } from './src/services/posCart';
import { getSettings, settingsPill, type UserSettings } from './src/services/settings';
import { colors } from './src/theme';

type ScreenKey = 'dashboard' | 'pos' | 'productos' | 'mesas' | 'caja' | 'reservas' | 'historial' | 'reportes' | 'sucursales' | 'usuarios' | 'configuracion';

type NavigationItem = {
  key: ScreenKey;
  label: string;
  icon: LucideIcon;
};

const navigationSections: Array<{ title: string; items: NavigationItem[] }> = [
  {
    title: 'Operación en salón',
    items: [
      { key: 'dashboard', label: 'Dashboard Mesas', icon: LayoutDashboard },
      { key: 'pos', label: 'Control Mesa & POS', icon: ShoppingCart },
      { key: 'reservas', label: 'Reservas', icon: CalendarClock },
      { key: 'historial', label: 'Historial y Recibos', icon: ReceiptText },
      { key: 'caja', label: 'Arqueo y Caja', icon: Wallet },
    ],
  },
  {
    title: 'Administración y Finanzas',
    items: [
      { key: 'reportes', label: 'Reportes Financieros', icon: ChartNoAxesCombined },
      { key: 'mesas', label: 'Mesas y Tarifas/Min', icon: Sliders },
      { key: 'productos', label: 'Inventario Local', icon: Package },
      { key: 'sucursales', label: 'Sucursales Cadena', icon: Building2 },
      { key: 'usuarios', label: 'Usuarios y Roles', icon: Users },
    ],
  },
];

const pageDetails: Record<ScreenKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard operativo', subtitle: 'Estado de mesas, sesiones, caja y ventas de la sucursal' },
  pos: { title: 'Control de mesa y POS', subtitle: 'Cronómetro, consumos y cobro de la cuenta' },
  mesas: { title: 'Mesas y tarifas', subtitle: 'Control de disponibilidad y sesiones de juego' },
  caja: { title: 'Arqueo y caja', subtitle: 'Arqueo, cierre de turno y conciliación de efectivo' },
  reservas: { title: 'Reservas', subtitle: 'Agenda de mesas por sucursal' },
  historial: { title: 'Historial y recibos', subtitle: 'Ventas registradas y comprobantes' },
  reportes: { title: 'Reportes financieros', subtitle: 'Ingresos registrados por período y sucursal' },
  sucursales: { title: 'Sucursales', subtitle: 'Administración de locales de la cadena' },
  productos: { title: 'Inventario local', subtitle: 'Productos, precios y existencias' },
  usuarios: { title: 'Usuarios y roles', subtitle: 'Acceso de operadores del sistema' },
  configuracion: { title: 'Configuración', subtitle: 'Preferencias de la aplicación y de los comprobantes' },
};

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 960;
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [posTarget, setPosTarget] = useState<string | undefined>(undefined);
  const [dashboardBranchId, setDashboardBranchId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useAccessibleModal(compact && menuOpen, () => setMenuOpen(false));

  useEffect(() => {
    if (!user) {
      setSettings(null);
      return;
    }
    let active = true;
    void getSettings()
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    return () => { active = false; };
  }, [user?.id_usuario]);

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={(authenticatedUser) => {
          setUser(authenticatedUser);
          setScreen('dashboard');
        }} />
      </>
    );
  }

  const logout = () => {
    setAccessToken(null);
    clearPosCarts();
    setUser(null);
    setScreen('dashboard');
    setPosTarget(undefined);
    setDashboardBranchId(undefined);
    setSettings(null);
    setMenuOpen(false);
  };

  const selectScreen = (nextScreen: ScreenKey) => {
    if (nextScreen === 'pos') setPosTarget(undefined);
    if (nextScreen === 'dashboard') setDashboardBranchId(undefined);
    setScreen(nextScreen);
    setMenuOpen(false);
  };

  const openPos = (tableId?: string) => {
    setPosTarget(tableId);
    setScreen('pos');
    setMenuOpen(false);
  };

  const openBranch = (branchId: string) => {
    setDashboardBranchId(branchId);
    setScreen('dashboard');
    setMenuOpen(false);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return <DashboardScreen initialBranchId={dashboardBranchId} user={user} onOpenPos={openPos} />;
      case 'pos':
        return (
          <PosScreen
            user={user}
            initialTableId={posTarget}
            onBackToDashboard={() => selectScreen('dashboard')}
          />
        );
      case 'productos':
        return <ProductsScreen user={user} />;
      case 'mesas':
        return <TablesScreen user={user} />;
      case 'caja':
        return <ArqueoScreen user={user} />;
      case 'reservas':
        return <ReservationsScreen user={user} onOpenPos={openPos} />;
      case 'historial':
        return <HistoryScreen user={user} />;
      case 'reportes':
        return <ReportsScreen user={user} />;
      case 'sucursales':
        return <BranchesScreen activeBranchId={dashboardBranchId} onOpenBranch={openBranch} />;
      case 'usuarios':
        return <UsersScreen user={user} />;
      case 'configuracion':
        return <SettingsScreen settings={settings} onSaved={setSettings} />;
    }
  };

  const renderSidebar = (mobile = false) => (
    <View style={[styles.sidebar, mobile ? styles.mobileSidebar : styles.desktopSidebar]}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}><Text style={styles.logoText}>8</Text></View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>BOLA<Text style={styles.brandAccent}>8</Text></Text>
          <Text style={styles.brandCaption}>Multi-sucursal · POS</Text>
        </View>
        {mobile ? (
          <Pressable
            accessibilityLabel="Cerrar menú de navegación"
            accessibilityRole="button"
            onPress={() => setMenuOpen(false)}
            style={styles.closeMenuButton}
          >
            <X color={colors.textMuted} size={20} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.nombre.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>{user.nombre}</Text>
          <Text numberOfLines={1} style={styles.profileRole}>{user.rol.replaceAll('_', ' ')}</Text>
        </View>
      </View>

      <ScrollView style={styles.navigation} contentContainerStyle={styles.navigationContent}>
        {navigationSections.map((section) => {
          const items = section.items.filter((item) => {
            if (item.key === 'reportes') return user.rol === 'admin_general' || user.rol === 'admin_sucursal';
            if (item.key === 'usuarios' || item.key === 'sucursales') return user.rol === 'admin_general';
            return true;
          });
          if (!items.length) return null;

          return (
            <View key={section.title} style={styles.navigationSection}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              {items.map((item) => {
                const Icon = item.icon;
                const active = screen === item.key;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={item.key}
                    onPress={() => selectScreen(item.key)}
                    style={({ pressed }) => [
                      styles.navItem,
                      active && styles.navItemActive,
                      pressed && styles.navItemPressed,
                    ]}
                  >
                    <Icon color={active ? colors.accent : colors.textMuted} size={18} strokeWidth={2} />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.sidebarFooterBlock}>
        <Pressable
          accessibilityRole="button"
          onPress={() => selectScreen('configuracion')}
          style={({ pressed }) => [styles.configButton, pressed && styles.navItemPressed]}
        >
          <View style={styles.configButtonCopy}>
            <Settings color={colors.accent} size={16} />
            <Text numberOfLines={1} style={styles.configButtonText}>Configuración App</Text>
          </View>
          <View style={styles.configPill}>
            <Text style={styles.configPillText}>{settingsPill(settings)}</Text>
          </View>
        </Pressable>

        <View style={styles.sidebarFooter}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerText}>Sesión autenticada</Text>
            <Text style={styles.footerStack}>React Native · Node · Supabase</Text>
          </View>
          <View style={styles.connectionDot} />
        </View>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        {!compact ? renderSidebar() : null}
        <View style={styles.workspace}>
          <View style={styles.topbar}>
            <View style={styles.topbarHeading}>
              {compact ? (
                <Pressable
                  accessibilityLabel="Abrir menú de navegación"
                  accessibilityRole="button"
                  onPress={() => setMenuOpen(true)}
                  style={styles.menuButton}
                >
                  <Menu color={colors.text} size={20} />
                </Pressable>
              ) : null}
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>BOLA8 · OPERACIONES</Text>
                <Text numberOfLines={1} style={styles.pageTitle}>{pageDetails[screen].title}</Text>
                {!compact ? <Text style={styles.pageSubtitle}>{pageDetails[screen].subtitle}</Text> : null}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={logout}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.navItemPressed]}
            >
              <LogOut color={colors.accent} size={17} />
              {!compact ? <Text style={styles.logoutText}>Cerrar sesión</Text> : null}
            </Pressable>
          </View>

          <View style={styles.content}>
            {renderScreen()}
          </View>
        </View>
        {compact && menuOpen ? (
          <Modal animationType="fade" onRequestClose={() => setMenuOpen(false)} transparent visible>
            <View
              onKeyDownCapture={(event) => {
                const key = event.nativeEvent.key;
                if (key === 'Escape') {
                  event.preventDefault();
                  setMenuOpen(false);
                  return;
                }
                if (key !== 'Tab' || Platform.OS !== 'web' || typeof document === 'undefined') return;

                const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
                if (!dialog) return;
                const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'))
                  .filter((element) => element.tabIndex >= 0 && !element.hasAttribute('disabled'));
                if (!focusable.length) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const focusOutsideDialog = !dialog.contains(document.activeElement);
                if (event.nativeEvent.shiftKey && (document.activeElement === first || focusOutsideDialog)) {
                  event.preventDefault();
                  last.focus();
                } else if (!event.nativeEvent.shiftKey && (document.activeElement === last || focusOutsideDialog)) {
                  event.preventDefault();
                  first.focus();
                }
              }}
              style={styles.drawerLayer}
            >
              <Pressable
                accessibilityLabel="Cerrar menú"
                accessibilityRole="button"
                onPress={() => setMenuOpen(false)}
                style={styles.drawerBackdrop}
              />
              {renderSidebar(true)}
            </View>
          </Modal>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  workspace: { flex: 1, minWidth: 0 },
  sidebar: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
  },
  desktopSidebar: { width: 272, height: '100%' },
  mobileSidebar: { width: '84%', maxWidth: 320, height: '100%', zIndex: 2, elevation: 8 },
  brandRow: {
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#05080e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  brandAccent: { color: colors.accent },
  brandCaption: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  closeMenuButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 18,
    padding: 11,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningSoft,
  },
  avatarText: { color: colors.warning, fontSize: 14, fontWeight: '900' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  profileRole: { color: colors.textMuted, fontSize: 10, textTransform: 'capitalize', marginTop: 3 },
  navigation: { flex: 1, marginTop: 16 },
  navigationContent: { paddingHorizontal: 12, paddingBottom: 16 },
  navigationSection: { marginBottom: 18 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginHorizontal: 10,
    marginBottom: 8,
  },
  navItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 11,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  navItemActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  navItemPressed: { opacity: 0.78 },
  navLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  navLabelActive: { color: colors.accent, fontWeight: '800' },
  sidebarFooter: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sidebarFooterBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  configButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  configButtonCopy: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 },
  configButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  configPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  configPillText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
  },
  footerCopy: { flex: 1, minWidth: 0 },
  footerStack: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  connectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  footerText: { color: colors.textMuted, fontSize: 11 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  topbarHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  menuButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
  },
  headingCopy: { minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', marginBottom: 3 },
  pageTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  pageSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  logoutButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  logoutText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
  },
  drawerLayer: { ...StyleSheet.absoluteFill, flexDirection: 'row', zIndex: 10, elevation: 10 },
  drawerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.68)' },
});
