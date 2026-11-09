import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
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

export default function ProductsScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const canManageProducts = user.rol !== 'cajero';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState(false);

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
        await updateProduct(editingProduct.id_producto, input);
        setNotice({ kind: 'success', text: 'Producto actualizado correctamente.' });
      } else {
        await createProduct(input);
        setNotice({ kind: 'success', text: 'Producto registrado en el inventario.' });
      }
      setFormVisible(false);
      await loadProducts(branchId);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!productToDeactivate) return;
    setDeactivating(true);
    setProductError(null);
    try {
      await deactivateProduct(productToDeactivate.id_producto);
      setProducts((current) => current.filter(
        (product) => product.id_producto !== productToDeactivate.id_producto,
      ));
      setNotice({ kind: 'success', text: `${productToDeactivate.nombre} se desactivó del inventario.` });
      setProductToDeactivate(null);
    } catch (error) {
      setProductError(getErrorMessage(error));
      setProductToDeactivate(null);
    } finally {
      setDeactivating(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      compact={compact}
      canManage={canManageProducts}
      onEdit={() => openEdit(item)}
      onDeactivate={() => setProductToDeactivate(item)}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id_producto)}
        renderItem={renderProduct}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        refreshControl={<RefreshControl refreshing={loading || branchesLoading} onRefresh={refresh} tintColor={colors.accent} />}
        ListHeaderComponent={(
          <View style={styles.headerArea}>
            <View style={[styles.topBar, compact && styles.topBarCompact]}>
              <View style={styles.brand}>
                <View style={styles.logo}><Text style={styles.logoText}>8</Text></View>
                <View>
                  <Text style={styles.brandName}>BOLA<Text style={styles.brandAccent}>8</Text></Text>
                  <Text style={styles.brandSub}>GESTIÓN MULTI-SUCURSAL</Text>
                </View>
              </View>
              <Text style={styles.environment}>INVENTARIO</Text>
            </View>

            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>OPERACIÓN · PRODUCTOS</Text>
                <Text style={styles.pageTitle}>Inventario local</Text>
                <Text style={styles.subtitle}>{canManageProducts ? 'Consulta y administra los productos de cada sucursal.' : 'Consulta el inventario de tu sucursal.'}</Text>
              </View>
              {canManageProducts ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={!branchId}
                  onPress={openCreate}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !branchId && styles.disabled]}
                >
                  <Text style={styles.primaryIcon}>＋</Text>
                  <Text style={styles.primaryText}>Nuevo producto</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
              <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  accessibilityLabel="Buscar productos"
                  editable={products.length > 0}
                  onChangeText={setSearch}
                  placeholder="Buscar por nombre o categoría"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
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
              <StatusCard title="No hay sucursales activas" message="Registra o activa una sucursal para administrar su inventario." />
            ) : (
              <>
                <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
                  <StatCard label="PRODUCTOS ACTIVOS" value={loading ? '…' : String(products.length)} accent />
                  <StatCard label="STOCK BAJO" value={loading ? '…' : String(lowStockCount)} warning={lowStockCount > 0} />
                  <StatCard label="SUCURSAL SELECCIONADA" value={branches.find((branch) => String(branch.id_sucursal) === branchId)?.nombre || '—'} wide />
                </View>

                <View style={styles.listHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>Productos</Text>
                    <Text style={styles.sectionSub}>Los cambios se guardan en la base de datos.</Text>
                  </View>
                  <Text style={styles.resultCount}>{filteredProducts.length} {filteredProducts.length === 1 ? 'artículo' : 'artículos'}</Text>
                </View>
              </>
            )}

            {notice && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Descartar mensaje"
                onPress={() => setNotice(null)}
                style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeSuccess]}
              >
                <Text style={[styles.noticeText, notice.kind === 'error' ? styles.errorText : styles.successText]}>{notice.text}</Text>
                <Text style={styles.noticeDismiss}>×</Text>
              </Pressable>
            )}

            {!!productError && (
              <StatusCard kind="error" title="No se pudieron cargar los productos" message={productError} actionLabel="Reintentar" onAction={() => loadProducts(branchId)} />
            )}
          </View>
        )}
        ListEmptyComponent={(
          branchesLoading || branchError || branches.length === 0 || productError ? <View /> : loading
            ? <StatusCard title="Cargando productos…" />
            : products.length === 0
              ? <StatusCard title="Inventario vacío" message="Esta sucursal aún no tiene productos registrados." actionLabel={canManageProducts ? 'Registrar producto' : undefined} onAction={canManageProducts ? openCreate : undefined} />
              : <StatusCard title="Sin resultados" message="No hay productos que coincidan con la búsqueda." actionLabel="Limpiar búsqueda" onAction={() => setSearch('')} />
        )}
        ListFooterComponent={<View style={styles.listFooter} />}
      />

      <ProductFormModal
        branchId={Number(branchId)}
        error={formError}
        onClose={() => setFormVisible(false)}
        onSave={saveProduct}
        product={editingProduct}
        saving={saving}
        visible={formVisible}
      />

      {productToDeactivate && (
        <ConfirmDialog
          title="Desactivar producto"
          message={`¿Desactivar “${productToDeactivate.nombre}” de esta sucursal? El registro de ventas histórico se conserva.`}
          confirming={deactivating}
          onCancel={() => !deactivating && setProductToDeactivate(null)}
          onConfirm={confirmDeactivate}
        />
      )}
    </SafeAreaView>
  );
}

function ProductCard({
  product,
  compact,
  canManage,
  onEdit,
  onDeactivate,
}: {
  product: Product;
  compact: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const lowStock = product.stock <= product.stock_minimo;
  return (
    <View style={[styles.productCard, shadows, compact && styles.productCardCompact]}>
      <View style={styles.productMain}>
        <View style={styles.productIdentity}>
          <View style={[styles.productIcon, lowStock && styles.productIconLow]}>
            <Text style={[styles.productIconText, lowStock && styles.productIconTextLow]}>
              {product.nombre.trim().slice(0, 1).toUpperCase() || 'P'}
            </Text>
          </View>
          <View style={styles.productNameWrap}>
            <Text numberOfLines={2} style={styles.productName}>{product.nombre}</Text>
            <Text numberOfLines={1} style={styles.productCategory}>{product.categoria || 'Sin categoría'}</Text>
          </View>
        </View>
        <View style={styles.productMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>PRECIO</Text>
            <Text style={styles.price}>Bs. {Number(product.precio_venta).toFixed(2)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>STOCK</Text>
            <Text style={[styles.stockValue, lowStock && styles.stockLow]}>{product.stock} <Text style={styles.stockUnit}>unid.</Text></Text>
          </View>
          <View style={styles.stockBadgeWrap}>
            <Text style={[styles.stockBadge, lowStock ? styles.stockBadgeLow : styles.stockBadgeOk]}>
              {lowStock ? `Bajo · mín. ${product.stock_minimo}` : 'Óptimo'}
            </Text>
          </View>
        </View>
      </View>
      {canManage ? (
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDeactivate} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Desactivar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  label,
  value,
  accent = false,
  warning = false,
  wide = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, wide && styles.statWide]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.statValue, accent && styles.statAccent, warning && styles.statWarning]}>{value}</Text>
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
      {kind === 'error' && <Text style={styles.statusIcon}>!</Text>}
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{title}</Text>
        {!!message && <Text style={styles.statusMessage}>{message}</Text>}
      </View>
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={() => { void onAction(); }} style={styles.statusAction}>
          <Text style={styles.statusActionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ConfirmDialog({
  title,
  message,
  confirming,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.confirmBackdrop}>
      <View accessibilityRole="alert" style={styles.confirmDialog}>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={styles.confirmActions}>
          <Pressable accessibilityRole="button" disabled={confirming} onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={confirming} onPress={onConfirm} style={styles.dangerButton}>
            {confirming ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.dangerText}>Desactivar</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Si ejecutas la app en un teléfono, configura EXPO_PUBLIC_API_URL con la IP local de tu computadora.`;
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado al comunicarse con el servidor.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 18 },
  contentCompact: { paddingHorizontal: 16, paddingTop: 8 },
  headerArea: { gap: 20 },
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 14 },
  topBarCompact: { minHeight: 58 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logo: { width: 39, height: 39, borderRadius: 22, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  logoText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  brandName: { color: colors.text, fontSize: 17, letterSpacing: 0.5, fontWeight: '900' },
  brandAccent: { color: colors.accent },
  brandSub: { color: colors.textMuted, fontSize: 8, letterSpacing: 1.2, fontWeight: '700', marginTop: 2 },
  environment: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, letterSpacing: 1.6, fontWeight: '800' },
  pageTitle: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  primaryButton: { minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: colors.accent },
  primaryIcon: { color: colors.background, fontSize: 20, fontWeight: '800', marginTop: -2 },
  primaryText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarCompact: { flexDirection: 'column', alignItems: 'stretch' },
  searchWrap: { minHeight: 50, flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchIcon: { width: 25, color: colors.textMuted, fontSize: 22, fontWeight: '600' },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 10 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statsRowCompact: { flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 145, minHeight: 78, paddingHorizontal: 15, paddingVertical: 13, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  statWide: { flex: 2 },
  statLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 8 },
  statAccent: { color: colors.accent },
  statWarning: { color: colors.warning },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  resultCount: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  productCard: { marginTop: 12, padding: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  productCardCompact: { padding: 14 },
  productMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  productIdentity: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 42, height: 42, flexShrink: 0, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  productIconLow: { backgroundColor: colors.warningSoft },
  productIconText: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  productIconTextLow: { color: colors.warning },
  productNameWrap: { flex: 1 },
  productName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  productCategory: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  productMetrics: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8 },
  metric: { minWidth: 74 },
  metricLabel: { color: colors.textMuted, fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  price: { color: colors.accent, fontSize: 13, fontWeight: '800', marginTop: 6 },
  stockValue: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  stockLow: { color: colors.warning },
  stockUnit: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  stockBadgeWrap: { minWidth: 82, alignItems: 'flex-end' },
  stockBadge: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, fontSize: 9, fontWeight: '800' },
  stockBadgeLow: { color: colors.warning, backgroundColor: colors.warningSoft },
  stockBadgeOk: { color: colors.accent, backgroundColor: colors.accentSoft },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 13, paddingTop: 11 },
  editButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surfaceRaised },
  editButtonText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.dangerSoft },
  deleteButtonText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  statusCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15 },
  statusError: { borderColor: 'rgba(244, 63, 94, 0.3)', backgroundColor: '#17121b' },
  statusIcon: { width: 26, height: 26, textAlign: 'center', textAlignVertical: 'center', color: colors.danger, fontWeight: '900', backgroundColor: colors.dangerSoft, borderRadius: 13, overflow: 'hidden' },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  statusMessage: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  statusAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surfaceRaised },
  statusActionText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 },
  noticeSuccess: { backgroundColor: colors.accentSoft },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '700' },
  successText: { color: colors.accent },
  errorText: { color: colors.danger },
  noticeDismiss: { marginLeft: 12, color: colors.textMuted, fontSize: 19 },
  confirmBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(2, 6, 23, 0.78)' },
  confirmDialog: { width: '100%', maxWidth: 440, padding: 22, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  confirmTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  confirmMessage: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 20 },
  cancelButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  dangerButton: { minHeight: 40, minWidth: 105, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#e11d48' },
  dangerText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
  listFooter: { height: 28 },
});
