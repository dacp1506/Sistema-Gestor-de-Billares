import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { ProductFormModal } from '../components/ProductFormModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import {
  createProduct,
  deactivateProduct,
  listBranches,
  listProducts,
  updateProduct,
} from '../services/products';
import type { Branch, Product, ProductInput } from '../services/products';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

function money(value: number | string) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Si ejecutas la app en un teléfono, configura EXPO_PUBLIC_API_URL con la IP local de tu computadora.`;
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado al comunicarse con el servidor.';
}

export default function ProductsScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const canManageProducts = user.rol !== 'cajero';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchError(null);
    try {
      const result = await listBranches();
      setBranches(result);
      setBranchId((current) => (
        result.some((branch) => String(branch.id_sucursal) === current)
          ? current
          : String(result[0]?.id_sucursal || '')
      ));
    } catch (error) {
      setBranchError(getErrorMessage(error));
      setBranches([]);
      setBranchId('');
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setProducts([]);
      setProductError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setProductError(null);
    try {
      setProducts(await listProducts(selectedBranchId));
    } catch (error) {
      setProducts([]);
      setProductError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    void loadProducts(branchId);
  }, [branchId, loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) => (
      product.nombre.toLocaleLowerCase().includes(query)
      || (product.categoria || '').toLocaleLowerCase().includes(query)
    ));
  }, [products, search]);

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= product.stock_minimo).length,
    [products],
  );

  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === branchId);

  const refresh = async () => {
    if (!branches.length) await loadBranches();
    else await loadProducts(branchId);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormError(null);
    setFormVisible(true);
  };

  const saveProduct = async (input: ProductInput) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id_producto, input);
        setProducts((current) => current.map((item) => (
          String(item.id_producto) === String(updated.id_producto) ? updated : item
        )));
        setNotice({ kind: 'success', text: `${updated.nombre} se actualizó correctamente.` });
      } else {
        const created = await createProduct(input);
        setProducts((current) => [...current, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNotice({ kind: 'success', text: `${created.nombre} se registró en el inventario local.` });
      }
      setFormVisible(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const restock = async (product: Product) => {
    if (restockingId) return;
    setRestockingId(String(product.id_producto));
    setNotice(null);
    try {
      const updated = await updateProduct(product.id_producto, {
        nombre: product.nombre,
        precio_venta: Number(product.precio_venta),
        stock: product.stock + 10,
        stock_minimo: product.stock_minimo,
        id_sucursal: Number(product.id_sucursal),
        categoria: product.categoria || null,
      });
      setProducts((current) => current.map((item) => (
        String(item.id_producto) === String(updated.id_producto) ? updated : item
      )));
      setNotice({ kind: 'success', text: `Stock reabastecido: +10 unid. de ${product.nombre}.` });
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setRestockingId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!productToDeactivate) return;
    setDeactivating(true);
    try {
      await deactivateProduct(productToDeactivate.id_producto);
      setProducts((current) => current.filter(
        (product) => product.id_producto !== productToDeactivate.id_producto,
      ));
      setNotice({ kind: 'success', text: `${productToDeactivate.nombre} se desactivó del inventario.` });
      setProductToDeactivate(null);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
      setProductToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        refreshControl={(
          <RefreshControl
            refreshing={loading || branchesLoading}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        )}
      >
        <View style={[styles.headerCard, shadows]}>
          <View style={[styles.headerTop, compact && styles.headerTopCompact]}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>ADMINISTRACIÓN · INVENTARIO</Text>
              <Text style={styles.title}>Inventario Local de Sucursal</Text>
              <Text style={styles.subtitle}>
                Control de existencias sincronizado automáticamente con las ventas del POS.
              </Text>
            </View>
            {canManageProducts ? (
              <Pressable
                accessibilityRole="button"
                disabled={!branchId}
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  !branchId && styles.disabled,
                ]}
              >
                <Plus color={colors.background} size={16} strokeWidth={3} />
                <Text style={styles.primaryText}>Nuevo Producto</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
            <View style={styles.searchWrap}>
              <Search color={colors.textMuted} size={16} />
              <TextInput
                accessibilityLabel="Filtrar producto"
                editable={products.length > 0}
                onChangeText={setSearch}
                placeholder="Filtrar producto..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={search}
              />
            </View>
          </View>
        </View>

        {branchesLoading ? (
          <StatusCard title="Cargando sucursales…" />
        ) : branchError ? (
          <StatusCard
            kind="error"
            title="No se pudieron cargar las sucursales"
            message={branchError}
            actionLabel="Reintentar"
            onAction={loadBranches}
          />
        ) : branches.length === 0 ? (
          <StatusCard
            title="No hay sucursales activas"
            message="Registra o activa una sucursal para administrar su inventario."
          />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <SummaryChip
                icon={<Package color={colors.accent} size={15} />}
                label="Productos activos"
                value={loading ? '…' : String(products.length)}
              />
              <SummaryChip
                icon={<AlertTriangle color={lowStockCount ? colors.danger : colors.textMuted} size={15} />}
                label="Con stock bajo"
                value={loading ? '…' : String(lowStockCount)}
                tone={lowStockCount ? 'danger' : 'neutral'}
              />
              <SummaryChip
                icon={<Boxes color={colors.info} size={15} />}
                label="Sucursal"
                value={selectedBranch?.nombre || '—'}
                tone="info"
                wide
              />
            </View>

            {notice ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Descartar mensaje"
                onPress={() => setNotice(null)}
                style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeSuccess]}
              >
                <Text style={[styles.noticeText, notice.kind === 'error' ? styles.noticeErrorText : styles.noticeSuccessText]}>
                  {notice.text}
                </Text>
                <Text style={styles.noticeDismiss}>×</Text>
              </Pressable>
            ) : null}

            {productError ? (
              <StatusCard
                kind="error"
                title="No se pudieron cargar los productos"
                message={productError}
                actionLabel="Reintentar"
                onAction={() => loadProducts(branchId)}
              />
            ) : null}

            <View style={[styles.tableCard, shadows]}>
              {!compact ? (
                <View style={styles.tableHead}>
                  <Text style={[styles.headCell, styles.colProduct]}>Producto</Text>
                  <Text style={[styles.headCell, styles.colCategory]}>Categoría</Text>
                  <Text style={[styles.headCell, styles.colPrice]}>Precio venta</Text>
                  <Text style={[styles.headCell, styles.colStock]}>Stock actual</Text>
                  <Text style={[styles.headCell, styles.colStatus]}>Estado stock</Text>
                  <Text style={[styles.headCell, styles.colActions, styles.alignRight]}>Reabastecer</Text>
                </View>
              ) : null}

              {loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.emptyText}>Cargando inventario…</Text>
                </View>
              ) : products.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package color={colors.textMuted} size={34} />
                  <Text style={styles.emptyTitle}>Inventario vacío</Text>
                  <Text style={styles.emptyText}>
                    Esta sucursal aún no tiene productos registrados.
                  </Text>
                  {canManageProducts ? (
                    <Pressable accessibilityRole="button" onPress={openCreate} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>Registrar producto</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Search color={colors.textMuted} size={30} />
                  <Text style={styles.emptyTitle}>Sin resultados</Text>
                  <Text style={styles.emptyText}>No hay productos que coincidan con “{search}”.</Text>
                  <Pressable accessibilityRole="button" onPress={() => setSearch('')} style={styles.emptyButton}>
                    <Text style={styles.emptyButtonText}>Limpiar búsqueda</Text>
                  </Pressable>
                </View>
              ) : compact ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={String(product.id_producto)}
                    product={product}
                    canManage={canManageProducts}
                    restocking={restockingId === String(product.id_producto)}
                    onRestock={() => void restock(product)}
                    onEdit={() => openEdit(product)}
                    onDeactivate={() => setProductToDeactivate(product)}
                  />
                ))
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow
                    key={String(product.id_producto)}
                    product={product}
                    canManage={canManageProducts}
                    restocking={restockingId === String(product.id_producto)}
                    onRestock={() => void restock(product)}
                    onEdit={() => openEdit(product)}
                    onDeactivate={() => setProductToDeactivate(product)}
                  />
                ))
              )}
            </View>

            <Text style={styles.footerNote}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'artículo' : 'artículos'} · Los cambios se guardan en la base de datos.
            </Text>
          </>
        )}
      </ScrollView>

      <ProductFormModal
        branchId={Number(branchId)}
        error={formError}
        onClose={() => setFormVisible(false)}
        onSave={saveProduct}
        product={editingProduct}
        saving={saving}
        visible={formVisible}
      />

      <ConfirmDialog
        visible={Boolean(productToDeactivate)}
        title="Desactivar producto"
        message={productToDeactivate
          ? `¿Desactivar “${productToDeactivate.nombre}” de esta sucursal? El registro de ventas histórico se conserva.`
          : ''}
        confirming={deactivating}
        onCancel={() => !deactivating && setProductToDeactivate(null)}
        onConfirm={() => void confirmDeactivate()}
      />
    </SafeAreaView>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  tone = 'neutral',
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'neutral' | 'danger' | 'info';
  wide?: boolean;
}) {
  return (
    <View style={[styles.summaryChip, wide && styles.summaryChipWide]}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text
          numberOfLines={1}
          style={[
            styles.summaryValue,
            tone === 'danger' && styles.summaryDanger,
            tone === 'info' && styles.summaryInfo,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ product }: { product: Product }) {
  const low = product.stock <= product.stock_minimo;
  return (
    <View style={[styles.badge, low ? styles.badgeLow : styles.badgeOk]}>
      {low
        ? <AlertTriangle color={colors.danger} size={12} />
        : <CheckCircle2 color={colors.accent} size={12} />}
      <Text style={[styles.badgeText, low ? styles.badgeTextLow : styles.badgeTextOk]}>
        {low ? `Stock bajo (mín. ${product.stock_minimo})` : 'Óptimo'}
      </Text>
    </View>
  );
}

function ProductRow({
  product,
  canManage,
  restocking,
  onRestock,
  onEdit,
  onDeactivate,
}: {
  product: Product;
  canManage: boolean;
  restocking: boolean;
  onRestock: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.colProduct}>
        <Text numberOfLines={2} style={styles.productName}>{product.nombre}</Text>
      </View>
      <View style={styles.colCategory}>
        <View style={styles.categoryChip}>
          <Text numberOfLines={1} style={styles.categoryText}>{product.categoria || 'Sin categoría'}</Text>
        </View>
      </View>
      <Text style={[styles.colPrice, styles.price]}>{money(product.precio_venta)}</Text>
      <Text style={[styles.colStock, styles.stock]}>
        {product.stock} <Text style={styles.stockUnit}>unid.</Text>
      </Text>
      <View style={styles.colStatus}>
        <StatusBadge product={product} />
      </View>
      <View style={[styles.colActions, styles.rowActions]}>
        {canManage ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reabastecer ${product.nombre} en 10 unidades`}
              disabled={restocking}
              onPress={onRestock}
              style={({ pressed }) => [styles.restockButton, pressed && styles.pressed, restocking && styles.disabled]}
            >
              {restocking
                ? <ActivityIndicator color={colors.info} size="small" />
                : <Text style={styles.restockText}>+10 Unid.</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${product.nombre}`} onPress={onEdit} style={styles.iconButton}>
              <Pencil color={colors.textMuted} size={15} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Desactivar ${product.nombre}`} onPress={onDeactivate} style={[styles.iconButton, styles.iconButtonDanger]}>
              <Trash2 color={colors.danger} size={15} />
            </Pressable>
          </>
        ) : (
          <Text style={styles.readOnlyText}>Solo lectura</Text>
        )}
      </View>
    </View>
  );
}

function ProductCard({
  product,
  canManage,
  restocking,
  onRestock,
  onEdit,
  onDeactivate,
}: {
  product: Product;
  canManage: boolean;
  restocking: boolean;
  onRestock: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <View style={styles.mobileCard}>
      <View style={styles.mobileTop}>
        <View style={styles.mobileIdentity}>
          <Text numberOfLines={2} style={styles.productName}>{product.nombre}</Text>
          <View style={styles.categoryChip}>
            <Text numberOfLines={1} style={styles.categoryText}>{product.categoria || 'Sin categoría'}</Text>
          </View>
        </View>
        <Text style={styles.price}>{money(product.precio_venta)}</Text>
      </View>

      <View style={styles.mobileMetrics}>
        <View>
          <Text style={styles.mobileMetricLabel}>STOCK ACTUAL</Text>
          <Text style={styles.stock}>
            {product.stock} <Text style={styles.stockUnit}>unid.</Text>
          </Text>
        </View>
        <StatusBadge product={product} />
      </View>

      {canManage ? (
        <View style={styles.mobileActions}>
          <Pressable
            accessibilityRole="button"
            disabled={restocking}
            onPress={onRestock}
            style={({ pressed }) => [styles.restockButton, styles.mobileRestock, pressed && styles.pressed, restocking && styles.disabled]}
          >
            {restocking
              ? <ActivityIndicator color={colors.info} size="small" />
              : <Text style={styles.restockText}>+10 Unid.</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${product.nombre}`} onPress={onEdit} style={styles.iconButton}>
            <Pencil color={colors.textMuted} size={15} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Desactivar ${product.nombre}`} onPress={onDeactivate} style={[styles.iconButton, styles.iconButtonDanger]}>
            <Trash2 color={colors.danger} size={15} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatusCard({
  title,
  message,
  kind = 'neutral',
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  kind?: 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <View style={[styles.statusCard, kind === 'error' && styles.statusError]}>
      {kind === 'error' ? <Text style={styles.statusIcon}>!</Text> : <RefreshCw color={colors.textMuted} size={18} />}
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{title}</Text>
        {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={() => { void onAction(); }} style={styles.statusAction}>
          <Text style={styles.statusActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ConfirmDialog({
  visible,
  title,
  message,
  confirming,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.confirmBackdrop}>
        <View accessibilityRole="alert" style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" disabled={confirming} onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={confirming} onPress={onConfirm} style={styles.dangerButton}>
              {confirming
                ? <ActivityIndicator color={colors.text} size="small" />
                : <Text style={styles.dangerText}>Desactivar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  contentCompact: { padding: 14, gap: 13 },

  headerCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 16,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerTopCompact: { flexDirection: 'column', alignItems: 'stretch' },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  primaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: colors.accent,
  },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarCompact: { flexDirection: 'column', alignItems: 'stretch' },
  searchWrap: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 9 },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryChip: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryChipWide: { flex: 2 },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  summaryDanger: { color: colors.danger },
  summaryInfo: { color: colors.info, fontSize: 12 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
  },
  noticeSuccess: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  noticeError: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  noticeSuccessText: { color: colors.accent },
  noticeErrorText: { color: colors.danger },
  noticeDismiss: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },

  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headCell: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.55)',
  },
  colProduct: { flex: 2.2, minWidth: 0 },
  colCategory: { flex: 1.2, minWidth: 0 },
  colPrice: { flex: 1, minWidth: 0 },
  colStock: { flex: 0.9, minWidth: 0 },
  colStatus: { flex: 1.5, minWidth: 0 },
  colActions: { width: 196, alignItems: 'flex-end' },
  alignRight: { textAlign: 'right' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },

  productName: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  categoryChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: colors.surfaceRaised,
  },
  categoryText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  price: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  stock: { color: colors.text, fontSize: 13, fontWeight: '800' },
  stockUnit: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },

  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgeLow: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextOk: { color: colors.accent },
  badgeTextLow: { color: colors.danger },

  restockButton: {
    minHeight: 30,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  restockText: { color: colors.info, fontSize: 10, fontWeight: '800' },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  iconButtonDanger: { backgroundColor: colors.dangerSoft },
  readOnlyText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },

  mobileCard: {
    padding: 15,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.55)',
  },
  mobileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  mobileIdentity: { flex: 1, minWidth: 0, gap: 6 },
  mobileMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  mobileMetricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  mobileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileRestock: { flex: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 34, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyButton: {
    marginTop: 8,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
  },
  emptyButtonText: { color: colors.accent, fontSize: 11, fontWeight: '800' },

  footerNote: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusError: { borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: colors.dangerSoft },
  statusIcon: { color: colors.danger, fontSize: 18, fontWeight: '900' },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  statusMessage: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  statusAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  statusActionText: { color: colors.accent, fontSize: 11, fontWeight: '800' },

  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 420,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  confirmTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  confirmMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 8 },
  cancelButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  dangerButton: { minHeight: 40, minWidth: 104, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.danger },
  dangerText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
