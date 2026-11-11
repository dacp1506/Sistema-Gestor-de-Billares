import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Beer,
  CheckCircle2,
  LayoutDashboard,
  Minus,
  Pause,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Timer,
  Trash2,
  X,
} from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranchOperators, type BranchOperator } from '../services/dashboard';
import { listBranches, listProducts, type Branch, type Product } from '../services/products';
import { createSale, type Sale } from '../services/sales';
import {
  createSession,
  finishSession,
  listActiveSessions,
  listTables,
  pauseSession,
  resumeSession,
  type Table,
  type TableSession,
} from '../services/tables';
import { loadPosCarts, posCartKey, savePosCart, type PosCartLine } from '../services/posCart';
import { colors, shadows } from '../theme';

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;

type PosTarget = { kind: 'direct' } | { kind: 'table'; tableId: string };

type ReceiptItem = {
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
};

type ReceiptData = {
  id: string;
  stage: 'preview' | 'issued';
  dateLabel: string;
  timestamp: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  concept: string;
  cashier: string;
  operator: string;
  payment: string;
  minutes: number;
  ratePerMin: number;
  rentalTotal: number;
  productsTotal: number;
  items: ReceiptItem[];
  total: number;
};

type PickerOption = {
  id: string;
  title: string;
  meta?: string;
  badge?: string;
};

type PosScreenProps = {
  user: AuthUser;
  initialBranchId?: string;
  initialTableId?: string;
  onBackToDashboard?: () => void;
};

function money(value: number | string) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function clock(value: number) {
  const safe = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sessionSeconds(session: TableSession) {
  const start = new Date(session.hora_inicio).getTime();
  if (Number.isNaN(start)) return 0;
  const pausedAt = session.pausada_en ? new Date(session.pausada_en).getTime() : NaN;
  const end = session.estado === 'pausada' && !Number.isNaN(pausedAt) ? pausedAt : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000) - Number(session.segundos_pausa || 0));
}

function sessionMinutes(session: TableSession) {
  const seconds = sessionSeconds(session);
  return seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : 0;
}

function sessionRental(session: TableSession) {
  return Number((sessionMinutes(session) * Number(session.tarifa_minuto || 0)).toFixed(2));
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'No se pudo completar la operación.';
}

export default function PosScreen({ user, initialBranchId, initialTableId, onBackToDashboard }: PosScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 1080;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState(
    initialBranchId || (user.rol === 'admin_general' ? '' : String(user.id_sucursal ?? '')),
  );
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<BranchOperator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [target, setTarget] = useState<PosTarget>(
    initialTableId ? { kind: 'table', tableId: initialTableId } : { kind: 'direct' },
  );
  const [carts, setCarts] = useState<Record<string, PosCartLine[]>>(() => loadPosCarts());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [picker, setPicker] = useState<'table' | 'operator' | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  useAccessibleModal(Boolean(picker), () => setPicker(null));
  useAccessibleModal(Boolean(receipt), () => setReceipt(null));

  useEffect(() => {
    let active = true;
    setBranchesLoading(true);
    void listBranches()
      .then((result) => {
        if (!active) return;
        setBranches(result);
        setBranchId((current) => {
          if (current && result.some((branch) => String(branch.id_sucursal) === current)) return current;
          if (initialBranchId && result.some((branch) => String(branch.id_sucursal) === initialBranchId)) {
            return initialBranchId;
          }
          if (user.rol !== 'admin_general') return String(user.id_sucursal ?? '');
          return String(result[0]?.id_sucursal || '');
        });
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setBranchesLoading(false);
      });
    return () => { active = false; };
  }, [initialBranchId, user.id_sucursal, user.rol]);

  const loadData = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setTables([]);
      setSessions([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [tableList, sessionList, productList] = await Promise.all([
        listTables(selectedBranchId),
        listActiveSessions(selectedBranchId),
        listProducts(selectedBranchId),
      ]);
      setTables(tableList);
      setSessions(sessionList);
      setProducts(productList);

      if (user.rol === 'admin_general') {
        const activeOperators = await listBranchOperators(selectedBranchId);
        setOperators(activeOperators);
        setSelectedOperatorId((current) => (
          activeOperators.some((operator) => String(operator.id_usuario) === current)
            ? current
            : String(activeOperators[0]?.id_usuario || '')
        ));
      }

      setTarget((current) => {
        if (current.kind === 'direct') return current;
        if (tableList.some((table) => String(table.id_mesa) === current.tableId && table.estado !== 'mantenimiento')) {
          return current;
        }
        return { kind: 'direct' };
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setTables([]);
      setSessions([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user.rol]);

  useEffect(() => {
    void loadData(branchId);
    if (!branchId) return;
    const interval = setInterval(() => { void loadData(branchId); }, 30_000);
    return () => clearInterval(interval);
  }, [branchId, loadData, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => setClockTick((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'bola8-pos-print';
    style.textContent = [
      '@page { size: 80mm auto; margin: 6mm; }',
      '@media print {',
      '  body * { visibility: hidden !important; }',
      '  #bola8-receipt-print, #bola8-receipt-print * { visibility: visible !important; }',
      '  #bola8-receipt-print { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; background: #fff !important; color: #0f172a !important; padding: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  void clockTick;

  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === branchId);
  const selectableTables = tables.filter((table) => table.estado !== 'mantenimiento');
  const selectedTable = target.kind === 'table'
    ? tables.find((table) => String(table.id_mesa) === target.tableId) || null
    : null;
  const selectedSession = selectedTable
    ? sessions.find((session) => (
      String(session.id_mesa) === String(selectedTable.id_mesa)
      && (session.estado === 'activa' || session.estado === 'pausada')
    )) || null
    : null;
  const cartKey = posCartKey(branchId, target.kind === 'table' ? target.tableId : undefined);
  const cart = carts[cartKey] || [];
  const elapsedSeconds = selectedSession ? sessionSeconds(selectedSession) : 0;
  const minutes = selectedSession ? sessionMinutes(selectedSession) : 0;
  const rentalTotal = selectedSession ? sessionRental(selectedSession) : 0;
  const productsTotal = Number(cart.reduce((sum, line) => sum + line.precio * line.cantidad, 0).toFixed(2));
  const grandTotal = Number((rentalTotal + productsTotal).toFixed(2));
  const selectedOperator = operators.find((operator) => String(operator.id_usuario) === selectedOperatorId);
  const selectedOperatorName = selectedOperator?.nombre
    || (user.rol === 'admin_general' ? '' : user.nombre);
  const needsOperator = user.rol === 'admin_general' && !selectedSession && !selectedOperatorId;
  const tableBlocked = Boolean(selectedTable && !selectedSession);

  const categories = useMemo(() => {
    const values = Array.from(new Set(products.map((product) => product.categoria).filter(Boolean))) as string[];
    return ['Todas', ...values.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'Todas' || product.categoria === category;
      const matchesSearch = !query
        || product.nombre.toLowerCase().includes(query)
        || String(product.categoria || '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);

  const tableOptions: PickerOption[] = [
    ...selectableTables.map((table) => ({
      id: `table:${table.id_mesa}`,
      title: `Mesa ${table.numero_mesa}`,
      meta: `${table.tipo_mesa} · ${money(table.tarifa_minuto)} / min`,
      badge: table.estado === 'ocupada' ? 'OCUPADA' : 'LIBRE',
    })),
    {
      id: 'direct',
      title: 'Venta Directa en Barra',
      meta: 'Sin mesa · solo productos',
      badge: 'POS',
    },
  ];

  const operatorOptions: PickerOption[] = operators.map((operator) => ({
    id: String(operator.id_usuario),
    title: operator.nombre,
    meta: operator.rol === 'cajero' ? 'Cajero' : 'Administrador de sucursal',
  }));

  const setCart = (key: string, lines: PosCartLine[]) => {
    setCarts((current) => ({ ...current, [key]: lines }));
    savePosCart(key, lines);
  };

  const updateCartLine = (productId: string, delta: number) => {
    const product = products.find((item) => String(item.id_producto) === productId);
    const currentLine = cart.find((line) => line.id_producto === productId);
    const nextQuantity = (currentLine?.cantidad || 0) + delta;
    if (delta > 0 && product && nextQuantity > Number(product.stock)) {
      setNotice({ tone: 'error', text: `Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}.` });
      return;
    }
    const nextLines = nextQuantity <= 0
      ? cart.filter((line) => line.id_producto !== productId)
      : currentLine
        ? cart.map((line) => line.id_producto === productId ? { ...line, cantidad: nextQuantity } : line)
        : [...cart, {
          id_producto: productId,
          nombre: product?.nombre || 'Producto',
          precio: Number(product?.precio_venta || 0),
          cantidad: 1,
        }];
    setCart(cartKey, nextLines);
    setNotice(null);
  };

  const addProduct = (product: Product) => {
    if (tableBlocked) {
      setNotice({ tone: 'info', text: 'Inicia el cronómetro de la mesa para cargar consumos en esta cuenta.' });
      return;
    }
    if (Number(product.stock) <= 0) {
      setNotice({ tone: 'error', text: `${product.nombre} no tiene stock disponible.` });
      return;
    }
    updateCartLine(String(product.id_producto), 1);
  };

  const startSession = async () => {
    if (!selectedTable || busy) return;
    const operatorId = Number(user.rol === 'admin_general' ? selectedOperatorId : user.id_usuario);
    if (!Number.isSafeInteger(operatorId) || operatorId <= 0) {
      setNotice({ tone: 'error', text: 'Selecciona un operador activo de la sucursal para iniciar la mesa.' });
      return;
    }

    setBusy('start');
    setNotice(null);
    try {
      await createSession({ id_mesa: Number(selectedTable.id_mesa), id_usuario: operatorId });
      setNotice({ tone: 'success', text: `Cronómetro iniciado en la mesa ${selectedTable.numero_mesa}.` });
      await loadData(branchId);
    } catch (startError) {
      setNotice({ tone: 'error', text: getErrorMessage(startError) });
    } finally {
      setBusy(null);
    }
  };

  const togglePause = async () => {
    if (!selectedSession || busy) return;
    setBusy('pause');
    setNotice(null);
    try {
      if (selectedSession.estado === 'activa') {
        await pauseSession(selectedSession.id_sesion);
        setNotice({ tone: 'success', text: `Cronómetro pausado en la mesa ${selectedTable?.numero_mesa}.` });
      } else {
        await resumeSession(selectedSession.id_sesion);
        setNotice({ tone: 'success', text: `Cronómetro reanudado en la mesa ${selectedTable?.numero_mesa}.` });
      }
      await loadData(branchId);
    } catch (actionError) {
      setNotice({ tone: 'error', text: getErrorMessage(actionError) });
    } finally {
      setBusy(null);
    }
  };

  const resolveOperatorId = () => {
    if (selectedSession) return Number(selectedSession.id_usuario);
    if (user.rol === 'admin_general') return Number(selectedOperatorId);
    return Number(user.id_usuario);
  };

  const buildReceipt = (stage: 'preview' | 'issued', sale: Sale | null, finished: TableSession | null): ReceiptData => {
    const finalMinutes = finished ? Number(finished.minutos_totales || 0) : minutes;
    const finalRental = finished ? Number(finished.total_tiempo || 0) : rentalTotal;
    const finalProducts = sale ? Number(sale.total_productos || 0) : productsTotal;
    const items: ReceiptItem[] = sale?.detalles?.length
      ? sale.detalles.map((detail) => ({
        nombre: detail.nombre || 'Producto',
        cantidad: Number(detail.cantidad),
        precio: Number(detail.precio_unitario),
        subtotal: Number(detail.subtotal),
      }))
      : cart.map((line) => ({
        nombre: line.nombre,
        cantidad: line.cantidad,
        precio: line.precio,
        subtotal: Number((line.precio * line.cantidad).toFixed(2)),
      }));

    return {
      id: sale ? String(sale.id_venta) : finished ? String(finished.id_sesion) : '—',
      stage,
      dateLabel: new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      branchName: selectedBranch?.nombre || 'Sucursal Bola8',
      branchAddress: selectedBranch?.direccion || 'Dirección no registrada',
      branchPhone: selectedBranch?.telefono || 'Sin teléfono',
      concept: target.kind === 'direct'
        ? 'Venta Directa Barra'
        : `Mesa ${selectedTable?.numero_mesa || ''} (${selectedTable?.tipo_mesa || 'Mesa'})`,
      cashier: user.nombre,
      operator: selectedSession
        ? operators.find((operator) => String(operator.id_usuario) === String(selectedSession.id_usuario))?.nombre
          || selectedOperatorName
          || user.nombre
        : selectedOperatorName || user.nombre,
      payment: 'Efectivo / QR',
      minutes: finalMinutes,
      ratePerMin: Number(selectedSession?.tarifa_minuto || selectedTable?.tarifa_minuto || 0),
      rentalTotal: finalRental,
      productsTotal: finalProducts,
      items,
      total: Number((finalRental + finalProducts).toFixed(2)),
    };
  };

  const openCheckout = () => {
    if (busy) return;
    if (target.kind === 'table' && !selectedSession) {
      setNotice({ tone: 'info', text: 'Inicia el cronómetro de la mesa antes de cobrar esta cuenta.' });
      return;
    }
    if (!cart.length && grandTotal <= 0) {
      setNotice({ tone: 'info', text: 'No hay montos pendientes para cobrar en esta cuenta.' });
      return;
    }
    if (needsOperator || !Number.isSafeInteger(resolveOperatorId()) || resolveOperatorId() <= 0) {
      setNotice({ tone: 'error', text: 'Selecciona un operador activo de la sucursal para registrar el cobro.' });
      return;
    }
    setNotice(null);
    setReceipt(buildReceipt('preview', null, null));
  };

  const confirmCheckout = async () => {
    if (busy || !receipt) return;
    const operatorId = resolveOperatorId();
    if (!Number.isSafeInteger(operatorId) || operatorId <= 0) {
      setNotice({ tone: 'error', text: 'Selecciona un operador activo de la sucursal para registrar el cobro.' });
      return;
    }

    setBusy('checkout');
    setNotice(null);
    let sale: Sale | null = null;
    try {
      if (cart.length) {
        sale = await createSale({
          id_sucursal: Number(branchId),
          id_usuario: operatorId,
          tipo_venta: target.kind === 'direct' ? 'directa' : 'mesa',
          id_sesion: selectedSession ? Number(selectedSession.id_sesion) : null,
          items: cart.map((line) => ({
            id_producto: Number(line.id_producto),
            cantidad: line.cantidad,
          })),
        });
      }

      let finished: TableSession | null = null;
      if (target.kind === 'table' && selectedSession) {
        finished = await finishSession(selectedSession.id_sesion);
      }

      setReceipt(buildReceipt('issued', sale, finished));
      setCart(cartKey, []);
      setNotice({ tone: 'success', text: 'Cobro registrado. El recibo quedó disponible para imprimir.' });
      await loadData(branchId);
    } catch (checkoutError) {
      const errorMsg = getErrorMessage(checkoutError);
      if (sale) {
        setCart(cartKey, []);
        setNotice({
          tone: 'error',
          text: `La venta #${sale.id_venta} quedó registrada, pero no se pudo cerrar la sesión. Finalízala desde el dashboard. ${errorMsg}`,
        });
        await loadData(branchId);
      } else if (errorMsg.includes('INVALID_BRANCH_OPERATOR') || errorMsg.includes('INVALID_SALE_SESSION')) {
        setNotice({ tone: 'error', text: 'El operador o sesión no son válidos para esta sucursal. Verifica la selección.' });
      } else if (errorMsg.includes('INSUFFICIENT_STOCK') || errorMsg.includes('INVALID_SALE_PRODUCT')) {
        setNotice({ tone: 'error', text: 'Error con los productos o stock. Verifica el catálogo.' });
      } else {
        setNotice({ tone: 'error', text: errorMsg });
      }
      setReceipt(null);
    } finally {
      setBusy(null);
    }
  };

  const printReceipt = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }
    setNotice({ tone: 'info', text: 'La impresión del recibo está disponible desde la versión web.' });
  };

  const refresh = () => setRefreshKey((current) => current + 1);

  const targetLabel = target.kind === 'direct'
    ? 'Venta Directa en Barra'
    : selectedTable
      ? `Mesa ${selectedTable.numero_mesa} · ${selectedTable.tipo_mesa}`
      : 'Selecciona una mesa';
  const targetStatus = target.kind === 'direct'
    ? 'Venta Directa'
    : !selectedTable
      ? 'Sin mesa'
      : selectedSession
        ? selectedSession.estado === 'pausada' ? 'Pausada' : 'En juego'
        : selectedTable.estado === 'mantenimiento' ? 'Mantenimiento' : 'Libre';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>OPERACIÓN · CONTROL & POS</Text>
            <Text style={styles.title}>Control de mesa y punto de venta</Text>
            <Text style={styles.subtitle}>
              Cronometra la mesa, carga consumos del catálogo y cobra la cuenta completa en un solo lugar.
            </Text>
          </View>
          <View style={styles.headerActions}>
            {onBackToDashboard ? (
              <Pressable
                accessibilityRole="button"
                onPress={onBackToDashboard}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LayoutDashboard color={colors.textMuted} size={16} />
                <Text style={styles.secondaryButtonText}>Dashboard</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Actualizar POS"
              disabled={loading || !branchId}
              onPress={refresh}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, (loading || !branchId) && styles.disabled]}
            >
              <RefreshCw color={colors.accent} size={16} />
              <Text style={styles.secondaryButtonText}>{loading ? 'Actualizando…' : 'Actualizar'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
          {user.rol === 'admin_general' ? (
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
          ) : (
            <View style={styles.branchLabel}>
              <Text style={styles.fieldLabel}>SUCURSAL</Text>
              <Text style={styles.branchName}>{selectedBranch?.nombre || 'Sucursal asignada'}</Text>
            </View>
          )}

          {user.rol === 'admin_general' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seleccionar operador de venta"
              onPress={() => setPicker('operator')}
              style={({ pressed }) => [styles.operatorTrigger, pressed && styles.pressed]}
            >
              <View style={styles.operatorCopy}>
                <Text style={styles.fieldLabel}>OPERADOR DE VENTA</Text>
                <Text numberOfLines={1} style={styles.operatorValue}>
                  {selectedSession
                    ? operators.find((operator) => String(operator.id_usuario) === String(selectedSession.id_usuario))?.nombre
                      || `Usuario ${selectedSession.id_usuario}`
                    : selectedOperatorName || 'Selecciona un operador'}
                </Text>
              </View>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
          ) : (
            <View style={styles.operatorTrigger}>
              <View style={styles.operatorCopy}>
                <Text style={styles.fieldLabel}>OPERADOR</Text>
                <Text numberOfLines={1} style={styles.operatorValue}>{user.nombre}</Text>
              </View>
            </View>
          )}
        </View>

        {branchesLoading ? <StatusBox text="Cargando sucursales…" /> : null}
        {error ? <StatusBox text={error} tone="error" /> : null}
        {notice ? <StatusBox text={notice.text} tone={notice.tone} /> : null}
        {loading && !tables.length && !products.length ? <StatusBox text="Cargando mesas y catálogo…" /> : null}
        {user.rol === 'admin_general' && Boolean(branchId) && !branchesLoading && !loading && !operators.length ? (
          <StatusBox text="La sucursal no tiene operadores activos asignados. Crea un usuario de sucursal para operar el POS." tone="error" />
        ) : null}

        <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
          <View style={[styles.panel, compact ? null : styles.leftPanel]}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelLabel}>SELECCIONAR MESA / CUENTA</Text>
              <View style={[
                styles.statusPill,
                target.kind === 'direct' ? styles.statusInfo
                  : selectedSession ? styles.statusWarning
                    : styles.statusSuccess,
              ]}>
                <Text style={styles.statusPillText}>{targetStatus}</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seleccionar mesa o venta directa"
              onPress={() => setPicker('table')}
              style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressed]}
            >
              <View style={styles.selectorCopy}>
                <Text numberOfLines={1} style={styles.selectorValue}>{targetLabel}</Text>
                <Text style={styles.selectorMeta}>
                  {target.kind === 'direct'
                    ? 'Sin cronómetro · productos y cobro inmediato'
                    : selectedSession
                      ? `Sesión #${selectedSession.id_sesion} · ${money(selectedSession.tarifa_minuto)} / min`
                      : selectedTable
                        ? `${money(selectedTable.tarifa_minuto)} / min · lista para iniciar`
                        : 'Sin mesas disponibles'}
                </Text>
              </View>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>

            {target.kind === 'direct' ? (
              <View style={styles.directPanel}>
                <ShoppingCart color={colors.info} size={22} />
                <View style={styles.directCopy}>
                  <Text style={styles.directTitle}>Venta directa en barra</Text>
                  <Text style={styles.directMeta}>No se cobra alquiler de mesa; solo los productos agregados.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.timerPanel}>
                <Text style={styles.timerMeta}>
                  {selectedTable ? `${selectedTable.tipo_mesa} · Tarifa ${money(selectedTable.tarifa_minuto)} / min` : 'Sin mesa seleccionada'}
                </Text>
                <Text style={[styles.timerClock, selectedSession ? styles.timerClockActive : styles.timerClockIdle]}>
                  {clock(elapsedSeconds)}
                </Text>
                <View style={styles.timerFacts}>
                  <Text style={styles.timerFact}>Minutos: <Text style={styles.timerFactStrong}>{minutes}</Text></Text>
                  <Text style={styles.timerFactSeparator}>•</Text>
                  <Text style={styles.timerFact}>Alquiler: <Text style={styles.timerRental}>{money(rentalTotal)}</Text></Text>
                </View>

                {selectedSession ? (
                  <View style={styles.timerControls}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy === 'pause'}
                      onPress={togglePause}
                      style={({ pressed }) => [
                        styles.timerButton,
                        selectedSession.estado === 'pausada' ? styles.timerButtonResume : styles.timerButtonPause,
                        pressed && styles.pressed,
                      ]}
                    >
                      {busy === 'pause'
                        ? <ActivityIndicator color={colors.text} size="small" />
                        : selectedSession.estado === 'pausada'
                          ? <Play color={colors.text} size={15} />
                          : <Pause color={colors.text} size={15} />}
                      <Text style={styles.timerButtonText}>
                        {selectedSession.estado === 'pausada' ? 'Reanudar' : 'Pausar'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={openCheckout}
                      style={({ pressed }) => [styles.timerButton, styles.timerButtonCheckout, pressed && styles.pressed]}
                    >
                      <Receipt color={colors.text} size={15} />
                      <Text style={styles.timerButtonText}>Cobrar</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === 'start' || !selectedTable}
                    onPress={startSession}
                    style={({ pressed }) => [styles.startButton, pressed && styles.pressed, (busy === 'start' || !selectedTable) && styles.disabled]}
                  >
                    {busy === 'start'
                      ? <ActivityIndicator color={colors.text} size="small" />
                      : <Play color={colors.text} size={16} />}
                    <Text style={styles.startButtonText}>Iniciar cronómetro</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.cartHeader}>
              <Text style={styles.panelLabel}>CONSUMOS EN ESTA CUENTA</Text>
              <View style={styles.cartHeaderActions}>
                <Text style={styles.cartCount}>{cart.reduce((sum, line) => sum + line.cantidad, 0)} ítems</Text>
                {cart.length ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Vaciar cuenta"
                    onPress={() => setCart(cartKey, [])}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Trash2 color={colors.danger} size={14} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.cartList}>
              {!cart.length ? (
                <Text style={styles.emptyText}>
                  {tableBlocked
                    ? 'Inicia el cronómetro y agrega productos del catálogo.'
                    : 'Sin productos agregados aún.'}
                </Text>
              ) : cart.map((line) => (
                <View key={line.id_producto} style={styles.cartRow}>
                  <View style={styles.cartCopy}>
                    <Text numberOfLines={1} style={styles.cartName}>{line.nombre}</Text>
                    <Text style={styles.cartPrice}>{money(line.precio)} c/u</Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar uno de ${line.nombre}`}
                      onPress={() => updateCartLine(line.id_producto, -1)}
                      style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed]}
                    >
                      <Minus color={colors.textMuted} size={13} />
                    </Pressable>
                    <Text style={styles.quantityValue}>{line.cantidad}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Agregar uno de ${line.nombre}`}
                      onPress={() => updateCartLine(line.id_producto, 1)}
                      style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed]}
                    >
                      <Plus color={colors.accent} size={13} />
                    </Pressable>
                  </View>
                  <Text style={styles.cartSubtotal}>{money(line.precio * line.cantidad)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal tiempo mesa:</Text>
                <Text style={styles.totalValue}>{money(rentalTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal productos POS:</Text>
                <Text style={styles.totalValue}>{money(productsTotal)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL A COBRAR:</Text>
                <Text style={styles.grandTotalValue}>{money(grandTotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy === 'checkout' || (!cart.length && grandTotal <= 0) || tableBlocked}
                onPress={openCheckout}
                style={({ pressed }) => [
                  styles.checkoutButton,
                  pressed && styles.pressed,
                  (busy === 'checkout' || (!cart.length && grandTotal <= 0) || tableBlocked) && styles.disabled,
                ]}
              >
                {busy === 'checkout'
                  ? <ActivityIndicator color={colors.text} size="small" />
                  : <Receipt color={colors.text} size={18} />}
                <Text style={styles.checkoutText}>Finalizar y cobrar cuenta</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.panel, compact ? null : styles.rightPanel]}>
            <View style={styles.catalogHeader}>
              <View style={styles.catalogHeading}>
                <Text style={styles.catalogTitle}>Catálogo POS de sucursal</Text>
                <Text style={styles.catalogSubtitle}>Toca un producto para añadirlo a la cuenta activa.</Text>
              </View>
              <View style={styles.searchBox}>
                <Search color={colors.textMuted} size={15} />
                <TextInput
                  accessibilityLabel="Buscar producto"
                  onChangeText={setSearch}
                  placeholder="Buscar bebida o snack…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
              </View>
            </View>

            <View style={styles.categoryRow}>
              {categories.map((item) => {
                const active = category === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={item}
                    onPress={() => setCategory(item)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      active ? styles.categoryChipActive : styles.categoryChipIdle,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.categoryText, active ? styles.categoryTextActive : styles.categoryTextIdle]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView style={styles.catalogScroll} contentContainerStyle={styles.catalogGrid}>
              {!filteredProducts.length ? (
                <View style={styles.catalogEmpty}>
                  <Beer color={colors.textMuted} size={28} />
                  <Text style={styles.emptyText}>
                    {products.length
                      ? 'No hay productos que coincidan con la búsqueda o categoría.'
                      : 'Esta sucursal todavía no tiene productos en inventario.'}
                  </Text>
                </View>
              ) : filteredProducts.map((product) => {
                const quantity = cart.find((line) => line.id_producto === String(product.id_producto))?.cantidad || 0;
                const stock = Number(product.stock);
                const lowStock = stock <= Number(product.stock_minimo);
                const outOfStock = stock <= 0;
                const limitReached = quantity >= stock;
                const disabled = outOfStock || limitReached;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Agregar ${product.nombre} a la cuenta`}
                    disabled={disabled}
                    key={String(product.id_producto)}
                    onPress={() => addProduct(product)}
                    style={({ pressed }) => [
                      styles.productCard,
                      disabled && styles.productCardDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.productTop}>
                      <Text style={styles.productCategory}>{product.categoria || 'General'}</Text>
                      <Text style={[styles.productStock, lowStock && styles.productStockLow]}>
                        Stock: {stock}
                      </Text>
                    </View>
                    <Text style={styles.productName}>{product.nombre}</Text>
                    <View style={styles.productBottom}>
                      <Text style={styles.productPrice}>{money(product.precio_venta)}</Text>
                      <View style={[styles.addIcon, disabled && styles.addIconDisabled]}>
                        <Plus color={disabled ? colors.textMuted : colors.accent} size={15} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <PickerModal
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          if (value === 'direct') setTarget({ kind: 'direct' });
          else setTarget({ kind: 'table', tableId: value.slice('table:'.length) });
          setPicker(null);
        }}
        options={tableOptions}
        selectedId={target.kind === 'direct' ? 'direct' : `table:${target.tableId}`}
        title="Seleccionar mesa o cuenta"
        visible={picker === 'table'}
      />

      <PickerModal
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setSelectedOperatorId(value);
          setPicker(null);
        }}
        options={operatorOptions}
        selectedId={selectedOperatorId}
        title="Seleccionar operador de venta"
        visible={picker === 'operator'}
      />

      <Modal animationType="fade" transparent visible={Boolean(receipt)} onRequestClose={() => setReceipt(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReceipt(null)}>
          <Pressable style={styles.receiptModal} onPress={(event) => event.stopPropagation()}>
            <View style={styles.receiptModalHeader}>
              <View style={styles.receiptModalTitleRow}>
                <View style={styles.receiptLogo}><Text style={styles.receiptLogoText}>8</Text></View>
                <View>
                  <Text style={styles.receiptModalTitle}>
                    {receipt?.stage === 'preview' ? 'Vista previa de cobro' : `Recibo emitido #${receipt?.id}`}
                  </Text>
                  <Text style={styles.receiptModalSubtitle}>
                    {receipt?.stage === 'preview' ? 'Revisa el detalle antes de confirmar' : 'Cobro registrado correctamente'}
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar recibo" onPress={() => setReceipt(null)}>
                <X color={colors.textMuted} size={20} />
              </Pressable>
            </View>

            {receipt ? (
              <ScrollView style={styles.receiptScroll} contentContainerStyle={styles.receiptScrollContent}>
                <View nativeID="bola8-receipt-print" style={styles.receiptPaper}>
                  <View style={styles.receiptBrand}>
                    <View style={styles.receiptBrandMark}><Text style={styles.receiptBrandMarkText}>8</Text></View>
                    <Text style={styles.receiptBrandName}>BOLA8</Text>
                    <Text style={styles.receiptBranch}>{receipt.branchName}</Text>
                    <Text style={styles.receiptMeta}>{receipt.branchAddress}</Text>
                    <Text style={styles.receiptMeta}>Tel: {receipt.branchPhone}</Text>
                  </View>

                  <View style={styles.receiptInfo}>
                    <ReceiptLine label="Fecha/Hora" value={`${receipt.dateLabel} ${receipt.timestamp}`} />
                    <ReceiptLine label="Concepto" value={receipt.concept} />
                    <ReceiptLine label="Cajero" value={receipt.cashier} />
                    <ReceiptLine label="Operador" value={receipt.operator} />
                    <ReceiptLine label="Pago" value={receipt.payment} />
                  </View>

                  <View style={styles.receiptItems}>
                    {receipt.rentalTotal > 0 ? (
                      <ReceiptLine
                        label={`Alquiler (${receipt.minutes}m x ${money(receipt.ratePerMin)})`}
                        value={money(receipt.rentalTotal)}
                      />
                    ) : null}
                    {receipt.items.map((item, index) => (
                      <ReceiptLine
                        key={`${item.nombre}-${index}`}
                        label={`${item.cantidad}x ${item.nombre}`}
                        value={money(item.subtotal)}
                      />
                    ))}
                    {!receipt.items.length && receipt.rentalTotal <= 0 ? (
                      <Text style={styles.receiptEmpty}>Sin consumos registrados.</Text>
                    ) : null}
                  </View>

                  <View style={styles.receiptTotals}>
                    <ReceiptLine label="Subtotal alquiler" value={money(receipt.rentalTotal)} muted />
                    <ReceiptLine label="Subtotal productos" value={money(receipt.productsTotal)} muted />
                    <ReceiptLine
                      label="IVA referencial (13%)"
                      value={money(Number((receipt.total * 0.13).toFixed(2)))}
                      muted
                    />
                    <View style={styles.receiptGrandRow}>
                      <Text style={styles.receiptGrandLabel}>TOTAL</Text>
                      <Text style={styles.receiptGrandValue}>{money(receipt.total)}</Text>
                    </View>
                  </View>

                  <View style={styles.receiptFooter}>
                    <Text style={styles.receiptBarcode}>|||| ||| || |||| ||| ||||</Text>
                    <Text style={styles.receiptThanks}>¡Gracias por jugar en Bola8!</Text>
                  </View>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.receiptActions}>
              {receipt?.stage === 'preview' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setReceipt(null)}
                    style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}
                  >
                    <Text style={styles.modalSecondaryText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy === 'checkout'}
                    onPress={confirmCheckout}
                    style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed, busy === 'checkout' && styles.disabled]}
                  >
                    {busy === 'checkout'
                      ? <ActivityIndicator color={colors.text} size="small" />
                      : <CheckCircle2 color={colors.text} size={16} />}
                    <Text style={styles.modalPrimaryText}>Confirmar y emitir</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setReceipt(null)}
                    style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}
                  >
                    <Text style={styles.modalSecondaryText}>Cerrar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={printReceipt}
                    style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed]}
                  >
                    <Printer color={colors.text} size={16} />
                    <Text style={styles.modalPrimaryText}>Imprimir / Guardar PDF</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBox({ text, tone = 'info' }: { text: string; tone?: 'success' | 'error' | 'info' }) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'none'}
      style={[
        styles.statusBox,
        tone === 'error' && styles.statusBoxError,
        tone === 'success' && styles.statusBoxSuccess,
      ]}
    >
      {tone === 'info' ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {tone === 'success' ? <CheckCircle2 color={colors.accent} size={16} /> : null}
      {tone === 'error' ? <Timer color={colors.danger} size={16} /> : null}
      <Text style={[
        styles.statusBoxText,
        tone === 'error' && styles.statusBoxTextError,
        tone === 'success' && styles.statusBoxTextSuccess,
      ]}>
        {text}
      </Text>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerModal} onPress={(event) => event.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={onClose}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerList}>
            {!options.length ? (
              <Text style={styles.emptyText}>No hay opciones disponibles.</Text>
            ) : options.map((option) => {
              const active = option.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                >
                  <View style={styles.pickerOptionCopy}>
                    <Text style={[styles.pickerOptionTitle, active && styles.pickerOptionTitleActive]}>
                      {option.title}
                    </Text>
                    {option.meta ? <Text style={styles.pickerOptionMeta}>{option.meta}</Text> : null}
                  </View>
                  <View style={styles.pickerOptionRight}>
                    {option.badge ? (
                      <View style={styles.pickerBadge}>
                        <Text style={styles.pickerBadgeText}>{option.badge}</Text>
                      </View>
                    ) : null}
                    {active ? <Text style={styles.pickerCheck}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ReceiptLine({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.receiptLine}>
      <Text style={[styles.receiptLineLabel, muted && styles.receiptLineMuted]}>{label}</Text>
      <Text style={[styles.receiptLineValue, muted && styles.receiptLineMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1600, alignSelf: 'center', padding: 24, gap: 16 },
  contentCompact: { padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 760 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  secondaryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  toolbarCompact: { alignItems: 'stretch', flexDirection: 'column' },
  branchLabel: {
    minWidth: 220,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  branchName: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  operatorTrigger: {
    minWidth: 240,
    maxWidth: 360,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  operatorCopy: { flex: 1, minWidth: 0 },
  operatorValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  chevron: { color: colors.accent, fontSize: 22, fontWeight: '700', marginTop: -6 },
  statusBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusBoxError: { borderColor: 'rgba(251, 113, 133, 0.4)', backgroundColor: colors.dangerSoft },
  statusBoxSuccess: { borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: colors.accentSoft },
  statusBoxText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  statusBoxTextError: { color: colors.danger },
  statusBoxTextSuccess: { color: colors.accent },
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  mainGridCompact: { flexDirection: 'column', alignItems: 'stretch' },
  panel: { flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, ...shadows },
  leftPanel: { flex: 5 },
  rightPanel: { flex: 7 },
  panelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  panelLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  statusPill: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  statusSuccess: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusWarning: { backgroundColor: colors.warningSoft, borderColor: 'rgba(245, 158, 11, 0.35)' },
  statusInfo: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  statusPillText: { color: colors.text, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  selectorTrigger: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  selectorCopy: { flex: 1, minWidth: 0 },
  selectorValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  selectorMeta: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  directPanel: {
    marginTop: 14,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  directCopy: { flex: 1 },
  directTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  directMeta: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  timerPanel: {
    marginTop: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  timerMeta: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  timerClock: { fontFamily: 'monospace', fontVariant: ['tabular-nums'], fontSize: 40, fontWeight: '900', letterSpacing: 1, marginVertical: 10 },
  timerClockActive: { color: colors.warning },
  timerClockIdle: { color: colors.textMuted },
  timerFacts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' },
  timerFact: { color: colors.textMuted, fontSize: 11 },
  timerFactStrong: { color: colors.warning, fontWeight: '800' },
  timerFactSeparator: { color: colors.textMuted },
  timerRental: { color: colors.accent, fontWeight: '800' },
  timerControls: { width: '100%', flexDirection: 'row', gap: 9 },
  timerButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10 },
  timerButtonPause: { backgroundColor: '#b45309' },
  timerButtonResume: { backgroundColor: colors.accent },
  timerButtonCheckout: { backgroundColor: '#0e7490' },
  timerButtonText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  startButton: { width: '100%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: colors.accent },
  startButtonText: { color: '#04130d', fontSize: 12, fontWeight: '900' },
  cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16, marginBottom: 8 },
  cartHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartCount: { color: colors.textMuted, fontSize: 10 },
  iconButton: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  cartList: {
    minHeight: 76,
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  cartRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  cartCopy: { flex: 1, minWidth: 0 },
  cartName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  cartPrice: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quantityButton: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  quantityValue: { color: colors.text, fontSize: 11, fontWeight: '800', minWidth: 14, textAlign: 'center' },
  cartSubtotal: { color: colors.accent, fontSize: 11, fontWeight: '800', minWidth: 64, textAlign: 'right' },
  totals: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  totalLabel: { color: colors.textMuted, fontSize: 11 },
  totalValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  grandTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 12 },
  grandTotalLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
  grandTotalValue: { color: colors.accent, fontSize: 24, fontWeight: '900' },
  checkoutButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: colors.accent },
  checkoutText: { color: '#04130d', fontSize: 13, fontWeight: '900' },
  catalogHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  catalogHeading: { flex: 1, minWidth: 180 },
  catalogTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  catalogSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  searchBox: {
    minWidth: 210,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 12, paddingVertical: 8, outlineStyle: 'none' } as never,
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  categoryChip: { borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  categoryChipActive: { backgroundColor: colors.accent },
  categoryChipIdle: { backgroundColor: colors.surfaceRaised },
  categoryText: { fontSize: 10, fontWeight: '800' },
  categoryTextActive: { color: '#04130d' },
  categoryTextIdle: { color: colors.textMuted },
  catalogScroll: { maxHeight: 560 },
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  catalogEmpty: { width: '100%', alignItems: 'center', paddingVertical: 40, gap: 10 },
  productCard: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 180,
    maxWidth: 340,
    minHeight: 132,
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  productCardDisabled: { opacity: 0.45 },
  productTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productCategory: { color: colors.textMuted, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  productStock: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  productStockLow: { color: colors.danger },
  productName: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 8, lineHeight: 18 },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  productPrice: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  addIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  addIconDisabled: { backgroundColor: colors.surface },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingVertical: 18 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(2, 6, 23, 0.82)' },
  pickerModal: { width: '100%', maxWidth: 470, maxHeight: '82%', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  pickerTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  pickerList: { flexGrow: 0 },
  pickerOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  pickerOptionActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.35)' },
  pickerOptionCopy: { flex: 1, minWidth: 0 },
  pickerOptionTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  pickerOptionTitleActive: { color: colors.accent },
  pickerOptionMeta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  pickerOptionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerBadge: { borderRadius: 99, backgroundColor: colors.surfaceRaised, paddingHorizontal: 7, paddingVertical: 3 },
  pickerBadgeText: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  pickerCheck: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  receiptModal: { width: '100%', maxWidth: 500, maxHeight: '90%', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  receiptModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  receiptModalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  receiptLogo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  receiptLogoText: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  receiptModalTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  receiptModalSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  receiptScroll: { flexGrow: 0, marginVertical: 12 },
  receiptScrollContent: { paddingBottom: 4 },
  receiptPaper: { backgroundColor: '#ffffff', borderRadius: 10, padding: 18, borderWidth: 1, borderColor: '#cbd5e1' },
  receiptBrand: { alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#94a3b8', borderStyle: 'dashed' },
  receiptBrandMark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  receiptBrandMarkText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  receiptBrandName: { color: '#0f172a', fontSize: 15, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  receiptBranch: { color: '#334155', fontSize: 11, fontWeight: '700', marginTop: 3 },
  receiptMeta: { color: '#64748b', fontSize: 9, marginTop: 2 },
  receiptInfo: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', borderStyle: 'dashed' },
  receiptLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  receiptLineLabel: { color: '#334155', fontSize: 10, flex: 1 },
  receiptLineValue: { color: '#0f172a', fontSize: 10, fontWeight: '700', textAlign: 'right' },
  receiptLineMuted: { color: '#64748b', fontWeight: '400' },
  receiptItems: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#94a3b8', borderStyle: 'dashed' },
  receiptEmpty: { color: '#64748b', fontSize: 10, textAlign: 'center', paddingVertical: 6 },
  receiptTotals: { paddingTop: 9 },
  receiptGrandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  receiptGrandLabel: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  receiptGrandValue: { color: '#047857', fontSize: 16, fontWeight: '900' },
  receiptFooter: { alignItems: 'center', marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  receiptBarcode: { color: '#0f172a', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  receiptThanks: { color: '#64748b', fontSize: 9, marginTop: 4 },
  receiptActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, flexWrap: 'wrap' },
  modalSecondary: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.surfaceRaised },
  modalSecondaryText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  modalPrimary: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.accent },
  modalPrimaryText: { color: '#04130d', fontSize: 11, fontWeight: '900' },
});
