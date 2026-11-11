import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Lock, Plus, RefreshCw, Trash2, Wrench } from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { OptionPicker } from '../components/OptionPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import {
  createTable,
  deactivateTable,
  listTables,
  updateTable,
  type Table,
  type TableInput,
} from '../services/tables';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

type TableForm = {
  numero_mesa: string;
  tipo_mesa: string;
  tarifa_minuto: string;
};

const TABLE_TYPES = [
  'Pool Profesional',
  'Pool Estándar',
  'Carambola 3 Bandas',
  'Snooker',
  'Sala VIP Privada',
];

const defaultForm = (): TableForm => ({
  numero_mesa: '',
  tipo_mesa: TABLE_TYPES[0],
  tarifa_minuto: '0.60',
});

const roleLabel: Record<AuthUser['rol'], string> = {
  admin_general: 'Admin General',
  admin_sucursal: 'Admin Sucursal',
  cajero: 'Cajero / Operador',
};

function money(value: number) {
  return `Bs. ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado en la operación.';
}

export default function TablesScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const canManageTables = user.rol !== 'cajero';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  useAccessibleModal(formVisible, () => setFormVisible(false));
  const [form, setForm] = useState<TableForm>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tableToDeactivate, setTableToDeactivate] = useState<Table | null>(null);
  useAccessibleModal(Boolean(tableToDeactivate), () => setTableToDeactivate(null));
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const loadTables = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setTables([]);
      setListError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError(null);
    try {
      setTables(await listTables(selectedBranchId));
    } catch (error) {
      setTables([]);
      setListError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBranches(); }, [loadBranches]);
  useEffect(() => { void loadTables(branchId); }, [branchId, loadTables]);

  useEffect(() => {
    setRateDrafts(Object.fromEntries(
      tables.map((table) => [String(table.id_mesa), Number(table.tarifa_minuto).toFixed(2)]),
    ));
  }, [tables]);

  useEffect(() => {
    setNotice(null);
    setFormError(null);
  }, [branchId]);

  const selectedBranchName = branches.find((branch) => String(branch.id_sucursal) === branchId)?.nombre;
  const typeOptions = useMemo(
    () => TABLE_TYPES.map((type) => ({ value: type, label: type })),
    [],
  );

  const openCreateForm = () => {
    setForm(defaultForm());
    setFormError(null);
    setFormVisible(true);
  };

  const saveRate = async (table: Table, rawValue: string) => {
    const key = String(table.id_mesa);
    const previous = Number(table.tarifa_minuto).toFixed(2);
    const value = Number(String(rawValue).replace(',', '.'));

    if (!Number.isFinite(value) || value <= 0) {
      setRateDrafts((current) => ({ ...current, [key]: previous }));
      setNotice({ kind: 'error', text: 'La tarifa por minuto debe ser mayor a Bs. 0,00.' });
      return;
    }
    if (Math.abs(value - Number(table.tarifa_minuto)) < 0.005) {
      setRateDrafts((current) => ({ ...current, [key]: value.toFixed(2) }));
      return;
    }

    setSavingRateId(key);
    setNotice(null);
    try {
      const payload: TableInput = {
        numero_mesa: table.numero_mesa,
        tipo_mesa: table.tipo_mesa,
        tarifa_minuto: Number(value.toFixed(2)),
        id_sucursal: Number(table.id_sucursal),
        estado: table.estado === 'mantenimiento' ? 'mantenimiento' : 'libre',
      };
      await updateTable(table.id_mesa, payload);
      setNotice({
        kind: 'success',
        text: `Tarifa de la mesa ${table.numero_mesa} actualizada a ${money(payload.tarifa_minuto)}/min.`,
      });
      await loadTables(branchId);
    } catch (error) {
      setRateDrafts((current) => ({ ...current, [key]: previous }));
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setSavingRateId(null);
    }
  };

  const toggleMaintenance = async (table: Table) => {
    const key = String(table.id_mesa);
    const nextState = table.estado === 'mantenimiento' ? 'libre' : 'mantenimiento';
    setTogglingId(key);
    setNotice(null);
    try {
      await updateTable(table.id_mesa, {
        numero_mesa: table.numero_mesa,
        tipo_mesa: table.tipo_mesa,
        tarifa_minuto: Number(table.tarifa_minuto),
        id_sucursal: Number(table.id_sucursal),
        estado: nextState,
      });
      setNotice({
        kind: 'success',
        text: `Mesa ${table.numero_mesa} ahora está en ${nextState === 'libre' ? 'LIBRE' : 'MANTENIMIENTO'}.`,
      });
      await loadTables(branchId);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setTogglingId(null);
    }
  };

  const submitTable = async () => {
    if (!branchId) {
      setFormError('Selecciona una sucursal antes de registrar la mesa.');
      return;
    }
    const numero = form.numero_mesa.trim();
    const tipo = form.tipo_mesa.trim();
    const tarifa = Number(form.tarifa_minuto.replace(',', '.'));
    if (!numero) {
      setFormError('El nombre o número de mesa es obligatorio.');
      return;
    }
    if (!tipo) {
      setFormError('Selecciona el tipo o modalidad de la mesa.');
      return;
    }
    if (!Number.isFinite(tarifa) || tarifa <= 0) {
      setFormError('La tarifa por minuto debe ser un número mayor a cero.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createTable({
        numero_mesa: numero,
        tipo_mesa: tipo,
        tarifa_minuto: Number(tarifa.toFixed(2)),
        id_sucursal: Number(branchId),
        estado: 'libre',
      });
      setFormVisible(false);
      setNotice({ kind: 'success', text: `Mesa "${numero}" creada con tarifa ${money(tarifa)}/min.` });
      await loadTables(branchId);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!tableToDeactivate) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deactivateTable(tableToDeactivate.id_mesa);
      const removed = tableToDeactivate;
      setTableToDeactivate(null);
      setNotice({ kind: 'success', text: `Mesa ${removed.numero_mesa} desactivada de la sucursal.` });
      await loadTables(branchId);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && !tables.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.headerCard}>
          <View style={[styles.headerRow, compact && styles.headerRowCompact]}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>ADMINISTRACIÓN · MESAS</Text>
              <Text style={styles.title}>Configuración de Mesas y Tarifas por Minuto</Text>
              <Text style={styles.subtitle}>
                Crea mesas nuevas, ajusta individualmente el precio por minuto (Bs.) o elimina mesas inactivas.
              </Text>
            </View>
            {canManageTables ? (
              <Pressable
                accessibilityRole="button"
                disabled={!branchId}
                onPress={openCreateForm}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.pressed,
                  !branchId && styles.disabled,
                ]}
              >
                <Plus color="#04130d" size={16} strokeWidth={2.6} />
                <Text style={styles.createText}>Crear Nueva Mesa</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
            <Pressable
              accessibilityLabel="Actualizar mesas"
              accessibilityRole="button"
              disabled={loading}
              onPress={() => { void loadTables(branchId); }}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.disabled]}
            >
              <RefreshCw color={colors.accent} size={15} />
              <Text style={styles.refreshText}>Actualizar</Text>
            </Pressable>
            {selectedBranchName ? <Text style={styles.branchHint}>{selectedBranchName}</Text> : null}
          </View>

          {branchesLoading ? <StatusBox text="Cargando sucursales…" /> : null}
          {branchError ? <StatusBox text={branchError} tone="error" /> : null}
        </View>

        {!canManageTables ? (
          <View style={styles.readonlyBanner}>
            <Lock color={colors.warning} size={16} />
            <Text style={styles.readonlyText}>
              Modo lectura: tu rol actual (<Text style={styles.readonlyStrong}>{roleLabel[user.rol]}</Text>) no tiene
              permisos para crear, eliminar ni editar tarifas de mesas. Cambia a{' '}
              <Text style={styles.readonlyStrong}>Admin Sucursal</Text> o{' '}
              <Text style={styles.readonlyStrong}>Admin General</Text> para editar.
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View style={[styles.notice, notice.kind === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.tablePanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Mesas de la sucursal</Text>
            <Text style={styles.panelMeta}>{tables.length} mesa{tables.length === 1 ? '' : 's'} activa{tables.length === 1 ? '' : 's'}</Text>
          </View>

          {!compact ? (
            <View style={styles.headRow}>
              <Text style={[styles.headCell, styles.colTable]}>Mesa</Text>
              <Text style={[styles.headCell, styles.colType]}>Categoría / Tipo</Text>
              <Text style={[styles.headCell, styles.colRate]}>Tarifa por Minuto (Bs.)</Text>
              <Text style={[styles.headCell, styles.colHour]}>Equivalente Hora</Text>
              <Text style={[styles.headCell, styles.colStatus]}>Estado Actual</Text>
              <Text style={[styles.headCell, styles.colActions, styles.headRight]}>Acciones</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loaderText}>Cargando mesas…</Text>
            </View>
          ) : listError ? (
            <View style={styles.loaderWrap}>
              <Text style={styles.errorTitle}>No se pudieron cargar las mesas</Text>
              <Text style={styles.loaderText}>{listError}</Text>
              <Pressable accessibilityRole="button" onPress={() => { void loadTables(branchId); }} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : isEmpty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay mesas activas en esta sucursal. Crea la primera con “Crear Nueva Mesa”.</Text>
            </View>
          ) : (
            tables.map((table) => {
              const key = String(table.id_mesa);
              const occupied = table.estado === 'ocupada';
              const editable = canManageTables && !occupied;
              const draft = rateDrafts[key] ?? Number(table.tarifa_minuto).toFixed(2);
              const hourly = (Number(draft.replace(',', '.')) || 0) * 60;

              return (
                <View key={key} style={[styles.row, compact && styles.rowCompact]}>
                  <View style={[styles.cellBlock, styles.colTable]}>
                    {compact ? <Text style={styles.cellLabel}>Mesa</Text> : null}
                    <Text style={styles.tableName}>Mesa {table.numero_mesa}</Text>
                  </View>

                  <View style={[styles.cellBlock, styles.colType]}>
                    {compact ? <Text style={styles.cellLabel}>Categoría / Tipo</Text> : null}
                    <Text style={styles.cellText}>{table.tipo_mesa}</Text>
                  </View>

                  <View style={[styles.cellBlock, styles.colRate]}>
                    {compact ? <Text style={styles.cellLabel}>Tarifa por minuto</Text> : null}
                    <View style={styles.rateWrap}>
                      <Text style={styles.ratePrefix}>Bs.</Text>
                      <TextInput
                        accessibilityLabel={`Tarifa por minuto de la mesa ${table.numero_mesa}`}
                        editable={editable && savingRateId !== key}
                        inputMode="decimal"
                        onBlur={() => { void saveRate(table, draft); }}
                        onChangeText={(value) => setRateDrafts((current) => ({ ...current, [key]: value }))}
                        onSubmitEditing={() => { void saveRate(table, draft); }}
                        selectTextOnFocus
                        style={[styles.rateInput, !editable && styles.rateInputDisabled]}
                        value={draft}
                      />
                      {savingRateId === key ? <ActivityIndicator color={colors.accent} size="small" /> : null}
                    </View>
                  </View>

                  <View style={[styles.cellBlock, styles.colHour]}>
                    {compact ? <Text style={styles.cellLabel}>Equivalente hora</Text> : null}
                    <Text style={styles.hourText}>{money(hourly)} / hora</Text>
                  </View>

                  <View style={[styles.cellBlock, styles.colStatus]}>
                    {compact ? <Text style={styles.cellLabel}>Estado actual</Text> : null}
                    <StatusBadge estado={table.estado} />
                  </View>

                  <View style={[styles.cellBlock, styles.colActions, styles.actionsCell]}>
                    {canManageTables ? (
                      <>
                        <Pressable
                          accessibilityLabel={`Alternar mantenimiento de la mesa ${table.numero_mesa}`}
                          accessibilityRole="button"
                          disabled={occupied || togglingId === key}
                          onPress={() => { void toggleMaintenance(table); }}
                          style={({ pressed }) => [
                            styles.iconButton,
                            pressed && styles.pressed,
                            (occupied || togglingId === key) && styles.disabled,
                          ]}
                        >
                          {togglingId === key
                            ? <ActivityIndicator color={colors.textMuted} size="small" />
                            : <Wrench color={colors.textMuted} size={15} />}
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Eliminar la mesa ${table.numero_mesa}`}
                          accessibilityRole="button"
                          disabled={occupied}
                          onPress={() => {
                            setDeleteError(null);
                            setTableToDeactivate(table);
                          }}
                          style={({ pressed }) => [
                            styles.iconButton,
                            styles.dangerButton,
                            pressed && styles.pressed,
                            occupied && styles.disabled,
                          ]}
                        >
                          <Trash2 color={colors.danger} size={15} />
                        </Pressable>
                      </>
                    ) : (
                      <Text style={styles.readonlyCell}>Solo lectura</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.footnote}>
          Las mesas ocupadas no permiten editar tarifa, cambiar de estado ni desactivarse hasta que la sesión finalice.
        </Text>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setFormVisible(false)} transparent visible={formVisible}>
        <Pressable style={styles.modalLayer} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalEyebrow}>NUEVA MESA</Text>
            <Text style={styles.modalTitle}>Crear Nueva Mesa en Sucursal</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre o Número de Mesa</Text>
              <TextInput
                accessibilityLabel="Nombre o número de mesa"
                onChangeText={(value) => setForm((current) => ({ ...current, numero_mesa: value }))}
                placeholder="Ej. 7 o Mesa 7 - VIP"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.numero_mesa}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tipo / Modalidad</Text>
              <OptionPicker
                label="Tipo o modalidad de la mesa"
                onSelect={(value) => setForm((current) => ({ ...current, tipo_mesa: value }))}
                options={typeOptions}
                value={form.tipo_mesa}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tarifa por Minuto (Bs.)</Text>
              <TextInput
                accessibilityLabel="Tarifa por minuto"
                inputMode="decimal"
                onChangeText={(value) => setForm((current) => ({ ...current, tarifa_minuto: value }))}
                placeholder="0.60"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.tarifa_minuto}
              />
            </View>

            {formError ? <Text style={styles.inlineError}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setFormVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={submitTable}
                style={[styles.saveButton, submitting && styles.disabled]}
              >
                {submitting
                  ? <ActivityIndicator color="#04130d" size="small" />
                  : <Text style={styles.saveText}>Guardar Mesa</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setTableToDeactivate(null)}
        transparent
        visible={Boolean(tableToDeactivate)}
      >
        <Pressable style={styles.modalLayer} onPress={() => setTableToDeactivate(null)}>
          <Pressable style={styles.confirmCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalEyebrow}>DESACTIVAR MESA</Text>
            <Text style={styles.modalTitle}>Eliminar mesa {tableToDeactivate?.numero_mesa}</Text>
            <Text style={styles.confirmMessage}>
              La mesa dejará de estar disponible para la operación y no aparecerá en las listas de la sucursal.
            </Text>

            {deleteError ? <Text style={styles.inlineError}>{deleteError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setTableToDeactivate(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deleting}
                onPress={confirmDeactivate}
                style={[styles.deleteButton, deleting && styles.disabled]}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.deleteText}>Eliminar Mesa</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ estado }: { estado: Table['estado'] }) {
  const label = estado === 'libre' ? 'LIBRE' : estado === 'ocupada' ? 'OCUPADA' : 'MANTENIMIENTO';
  return (
    <View style={[
      styles.badge,
      estado === 'libre' ? styles.badgeFree : estado === 'ocupada' ? styles.badgeBusy : styles.badgeMaintenance,
    ]}>
      <Text style={[
        styles.badgeText,
        estado === 'libre' ? styles.badgeTextFree : estado === 'ocupada' ? styles.badgeTextBusy : styles.badgeTextMaintenance,
      ]}>
        {label}
      </Text>
    </View>
  );
}

function StatusBox({ text, tone = 'info' }: { text: string; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.statusBox, tone === 'error' && styles.statusBoxError]}>
      <Text style={[styles.statusText, tone === 'error' && styles.statusTextError]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  contentCompact: { padding: 14, gap: 14 },

  headerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    ...shadows,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  headerRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  createButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
  },
  createText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.5 },

  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16 },
  toolbarCompact: { flexDirection: 'column', alignItems: 'stretch' },
  refreshButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  refreshText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  branchHint: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  statusBox: {
    marginTop: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
  },
  statusBoxError: { backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.3)' },
  statusText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  statusTextError: { color: colors.danger },

  readonlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: colors.warningSoft,
  },
  readonlyText: { flex: 1, color: colors.warning, fontSize: 12, lineHeight: 18 },
  readonlyStrong: { fontWeight: '900' },

  notice: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1 },
  noticeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' },
  noticeError: { backgroundColor: 'rgba(251, 113, 133, 0.12)', borderColor: 'rgba(251, 113, 133, 0.35)' },
  noticeText: { color: colors.text, fontWeight: '700', fontSize: 12 },

  tablePanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  panelMeta: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headCell: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  headRight: { textAlign: 'right' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.7)',
  },
  rowCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingVertical: 16 },
  cellBlock: { minWidth: 0 },
  cellLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },

  colTable: { flexBasis: 140, flexGrow: 1 },
  colType: { flexBasis: 155, flexGrow: 1 },
  colRate: { width: 168 },
  colHour: { width: 148 },
  colStatus: { width: 132 },
  colActions: { width: 110 },
  actionsCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },

  tableName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  cellText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  hourText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  rateWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratePrefix: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  rateInput: {
    width: 84,
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.accent,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '800',
  },
  rateInputDisabled: { opacity: 0.55, color: colors.textMuted },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  badgeFree: { backgroundColor: colors.accentSoft },
  badgeBusy: { backgroundColor: colors.warningSoft },
  badgeMaintenance: { backgroundColor: colors.surfaceRaised },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  badgeTextFree: { color: colors.accent },
  badgeTextBusy: { color: colors.warning },
  badgeTextMaintenance: { color: colors.textMuted },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  dangerButton: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(251, 113, 133, 0.35)' },
  readonlyCell: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },

  loaderWrap: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34, paddingHorizontal: 18 },
  loaderText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  errorTitle: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  retryButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: colors.accent },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    margin: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 13,
  },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  footnote: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },

  modalLayer: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows,
  },
  modalEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5, marginBottom: 16 },
  confirmMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  fieldGroup: { marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  input: {
    minHeight: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
  },
  inlineError: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 10, lineHeight: 17 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  saveButton: {
    minHeight: 42,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  saveText: { color: '#04130d', fontSize: 12, fontWeight: '800' },
  deleteButton: {
    minHeight: 42,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
