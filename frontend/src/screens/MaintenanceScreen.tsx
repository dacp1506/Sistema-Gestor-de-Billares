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
  ArrowRightCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react-native';
import { BranchPicker } from '../components/BranchPicker';
import { MaintenanceFormModal } from '../components/MaintenanceFormModal';
import { OptionPicker } from '../components/OptionPicker';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { ApiError } from '../services/api';
import type { AuthUser } from '../services/auth';
import { listBranches } from '../services/products';
import type { Branch } from '../services/products';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TRANSITIONS,
  changeMaintenanceRequestStatus,
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  listMaintenanceEquipment,
  listMaintenanceRequests,
  updateMaintenanceRequest,
} from '../services/maintenance';
import type {
  MaintenanceEquipment,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestInput,
  MaintenanceStatus,
} from '../services/maintenance';
import { colors, shadows } from '../theme';

type Notice = { kind: 'success' | 'error'; text: string } | null;

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'RESUELTA', label: 'Resuelta' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_TIMEOUT') {
      return `${error.message} Si ejecutas la app en un teléfono, configura EXPO_PUBLIC_API_URL con la IP local de tu computadora.`;
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado al comunicarse con el servidor.';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

export default function MaintenanceScreen({ user }: { user: AuthUser }) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const canManage = user.rol !== 'cajero';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [equipment, setEquipment] = useState<MaintenanceEquipment[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [detailTarget, setDetailTarget] = useState<MaintenanceRequest | null>(null);
  const [statusTarget, setStatusTarget] = useState<MaintenanceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);

  useAccessibleModal(Boolean(detailTarget), () => setDetailTarget(null));
  useAccessibleModal(Boolean(statusTarget), () => setStatusTarget(null));
  useAccessibleModal(Boolean(deleteTarget), () => setDeleteTarget(null));

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

  const loadRequests = useCallback(async (
    selectedBranchId: string,
    filters: { q: string; prioridad: MaintenancePriority | ''; estado: MaintenanceStatus | '' },
  ) => {
    if (!selectedBranchId) {
      setRequests([]);
      setDataError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDataError(null);
    try {
      setRequests(await listMaintenanceRequests(selectedBranchId, filters));
    } catch (error) {
      setRequests([]);
      setDataError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEquipment = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setEquipment([]);
      return;
    }
    try {
      setEquipment(await listMaintenanceEquipment(selectedBranchId));
    } catch {
      setEquipment([]);
    }
  }, []);

  useEffect(() => { void loadBranches(); }, [loadBranches]);

  useEffect(() => {
    setNotice(null);
    setSearch('');
    setPriorityFilter('');
    setStatusFilter('');
    void loadEquipment(branchId);
  }, [branchId, loadEquipment]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadRequests(branchId, {
      q: debouncedSearch,
      prioridad: priorityFilter,
      estado: statusFilter,
    });
  }, [branchId, debouncedSearch, priorityFilter, statusFilter, loadRequests]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.estado === 'PENDIENTE').length,
    inProgress: requests.filter((item) => item.estado === 'EN_PROCESO').length,
    resolved: requests.filter((item) => item.estado === 'RESUELTA').length,
  }), [requests]);

  const selectedBranch = branches.find((branch) => String(branch.id_sucursal) === branchId);

  const refresh = async () => {
    if (!branches.length) {
      await loadBranches();
      return;
    }
    await Promise.all([loadEquipment(branchId), loadRequests(branchId, {
      q: debouncedSearch,
      prioridad: priorityFilter,
      estado: statusFilter,
    })]);
  };

  const openCreate = () => {
    setEditingRequest(null);
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setFormError(null);
    setDetailTarget(null);
    setFormVisible(true);
  };

  const saveRequest = async (input: MaintenanceRequestInput) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingRequest) {
        const updated = await updateMaintenanceRequest(editingRequest.id_solicitud, input);
        setRequests((current) => current.map((item) => (
          String(item.id_solicitud) === String(updated.id_solicitud) ? updated : item
        )));
        setNotice({ kind: 'success', text: `${updated.codigo_solicitud} se actualizó correctamente.` });
      } else {
        const created = await createMaintenanceRequest({
          ...input,
          id_sucursal: branchId ? Number(branchId) : undefined,
        });
        setRequests((current) => [created, ...current]);
        setNotice({
          kind: 'success',
          text: `${created.codigo_solicitud} registrada como PENDIENTE para ${created.equipo}.`,
        });
      }
      setFormVisible(false);
      setEditingRequest(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const applyStatus = async (nextStatus: MaintenanceStatus) => {
    if (!statusTarget) return;
    setChangingStatus(true);
    try {
      const updated = await changeMaintenanceRequestStatus(statusTarget.id_solicitud, nextStatus);
      setRequests((current) => current.map((item) => (
        String(item.id_solicitud) === String(updated.id_solicitud) ? updated : item
      )));
      setNotice({
        kind: 'success',
        text: `${updated.codigo_solicitud} cambió a ${MAINTENANCE_STATUS_LABEL[updated.estado]}.`,
      });
      setStatusTarget(null);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setChangingStatus(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMaintenanceRequest(deleteTarget.id_solicitud);
      setRequests((current) => current.filter(
        (item) => String(item.id_solicitud) !== String(deleteTarget.id_solicitud),
      ));
      setNotice({
        kind: 'success',
        text: `${deleteTarget.codigo_solicitud} se eliminó lógicamente del listado activo.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      setNotice({ kind: 'error', text: getErrorMessage(error) });
    } finally {
      setDeleting(false);
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
              <Text style={styles.eyebrow}>OPERACIÓN · MANTENIMIENTO</Text>
              <Text style={styles.title}>Solicitudes de mantenimiento</Text>
              <Text style={styles.subtitle}>
                Reporta fallas de mesas, bolas, tacos e iluminación; controla el estado del
                servicio sin perder el histórico de la sucursal.
              </Text>
            </View>
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
              <Text style={styles.primaryText}>Nueva solicitud</Text>
            </Pressable>
          </View>

          <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
            <BranchPicker branches={branches} selectedBranchId={branchId} onSelect={setBranchId} />
            <View style={styles.searchWrap}>
              <Search color={colors.textMuted} size={16} />
              <TextInput
                accessibilityLabel="Buscar solicitud por código, solicitante o equipo"
                onChangeText={setSearch}
                placeholder="Buscar código, solicitante o equipo..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={search}
              />
            </View>
          </View>

          <View style={[styles.filtersRow, compact && styles.filtersRowCompact]}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>PRIORIDAD</Text>
              <OptionPicker
                label="Filtrar por prioridad"
                onSelect={(value) => setPriorityFilter(value as MaintenancePriority | '')}
                options={PRIORITY_OPTIONS}
                value={priorityFilter}
              />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>ESTADO</Text>
              <OptionPicker
                label="Filtrar por estado"
                onSelect={(value) => setStatusFilter(value as MaintenanceStatus | '')}
                options={STATUS_OPTIONS}
                value={statusFilter}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
              onPress={() => {
                setSearch('');
                setPriorityFilter('');
                setStatusFilter('');
              }}
              style={styles.clearButton}
            >
              <RefreshCw color={colors.textMuted} size={14} />
              <Text style={styles.clearText}>Limpiar</Text>
            </Pressable>
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
            message="Registra o activa una sucursal para administrar su mantenimiento."
          />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <SummaryChip icon={<ClipboardList color={colors.info} size={15} />} label="En la vista" value={loading ? '…' : String(summary.total)} tone="info" />
              <SummaryChip icon={<Wrench color={colors.warning} size={15} />} label="Pendientes" value={loading ? '…' : String(summary.pending)} tone="warning" />
              <SummaryChip icon={<ArrowRightCircle color={colors.info} size={15} />} label="En proceso" value={loading ? '…' : String(summary.inProgress)} tone="info" />
              <SummaryChip icon={<CheckCircle2 color={colors.accent} size={15} />} label="Resueltas" value={loading ? '…' : String(summary.resolved)} />
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

            {dataError ? (
              <StatusCard
                kind="error"
                title="No se pudieron cargar las solicitudes"
                message={dataError}
                actionLabel="Reintentar"
                onAction={() => loadRequests(branchId, {
                  q: debouncedSearch,
                  prioridad: priorityFilter,
                  estado: statusFilter,
                })}
              />
            ) : null}

            <View style={[styles.tableCard, shadows]}>
              {!compact ? (
                <View style={styles.tableHead}>
                  <Text style={[styles.headCell, styles.colCode]}>Código</Text>
                  <Text style={[styles.headCell, styles.colEquipment]}>Equipo</Text>
                  <Text style={[styles.headCell, styles.colApplicant]}>Solicitante</Text>
                  <Text style={[styles.headCell, styles.colPriority]}>Prioridad</Text>
                  <Text style={[styles.headCell, styles.colStatus]}>Estado</Text>
                  <Text style={[styles.headCell, styles.colDate]}>Registro</Text>
                  <Text style={[styles.headCell, styles.colActions, styles.alignRight]}>Acciones</Text>
                </View>
              ) : null}

              {loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.emptyText}>Cargando solicitudes…</Text>
                </View>
              ) : requests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Wrench color={colors.textMuted} size={34} />
                  <Text style={styles.emptyTitle}>Sin solicitudes activas</Text>
                  <Text style={styles.emptyText}>
                    No hay solicitudes que coincidan con la sucursal y los filtros actuales.
                  </Text>
                  {branchId ? (
                    <Pressable accessibilityRole="button" onPress={openCreate} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>Registrar solicitud</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : compact ? (
                requests.map((request) => (
                  <RequestCard
                    key={String(request.id_solicitud)}
                    request={request}
                    canManage={canManage}
                    onDetail={() => setDetailTarget(request)}
                    onEdit={() => openEdit(request)}
                    onStatus={() => setStatusTarget(request)}
                    onDelete={() => setDeleteTarget(request)}
                  />
                ))
              ) : (
                requests.map((request) => (
                  <RequestRow
                    key={String(request.id_solicitud)}
                    request={request}
                    canManage={canManage}
                    onDetail={() => setDetailTarget(request)}
                    onEdit={() => openEdit(request)}
                    onStatus={() => setStatusTarget(request)}
                    onDelete={() => setDeleteTarget(request)}
                  />
                ))
              )}
            </View>

            <Text style={styles.footerNote}>
              {requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'} en la vista · {selectedBranch?.nombre || 'Sin sucursal'} · Los datos se leen desde PostgreSQL.
            </Text>
          </>
        )}
      </ScrollView>

      <MaintenanceFormModal
        equipment={equipment}
        error={formError}
        onClose={() => {
          setFormVisible(false);
          setEditingRequest(null);
        }}
        onSave={saveRequest}
        request={editingRequest}
        saving={saving}
        visible={formVisible}
      />

      <DetailDialog
        request={detailTarget}
        canManage={canManage}
        onClose={() => setDetailTarget(null)}
        onEdit={(request) => openEdit(request)}
        onStatus={(request) => {
          setDetailTarget(null);
          setStatusTarget(request);
        }}
        onDelete={(request) => {
          setDetailTarget(null);
          setDeleteTarget(request);
        }}
      />

      <StatusDialog
        request={statusTarget}
        changing={changingStatus}
        onClose={() => setStatusTarget(null)}
        onChange={(next) => void applyStatus(next)}
      />

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Eliminar solicitud"
        message={deleteTarget
          ? `¿Eliminar lógicamente “${deleteTarget.codigo_solicitud}”? Dejará de aparecer en el listado, pero permanecerá en la base de datos con activo=false.`
          : ''}
        confirming={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </SafeAreaView>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'info';
}) {
  return (
    <View style={styles.summaryChip}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[
          styles.summaryValue,
          tone === 'warning' && styles.summaryWarning,
          tone === 'info' && styles.summaryInfo,
        ]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const style = priority === 'ALTA'
    ? styles.priorityHigh
    : priority === 'MEDIA'
      ? styles.priorityMedium
      : styles.priorityLow;
  const textStyle = priority === 'ALTA'
    ? styles.priorityHighText
    : priority === 'MEDIA'
      ? styles.priorityMediumText
      : styles.priorityLowText;
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{PRIORITY_LABEL[priority]}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const style = status === 'PENDIENTE'
    ? styles.statusPending
    : status === 'EN_PROCESO'
      ? styles.statusInProgress
      : status === 'RESUELTA'
        ? styles.statusResolved
        : styles.statusCancelled;
  const textStyle = status === 'PENDIENTE'
    ? styles.statusPendingText
    : status === 'EN_PROCESO'
      ? styles.statusInProgressText
      : status === 'RESUELTA'
        ? styles.statusResolvedText
        : styles.statusCancelledText;
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{MAINTENANCE_STATUS_LABEL[status]}</Text>
    </View>
  );
}

function RequestActions({
  request,
  canManage,
  onDetail,
  onEdit,
  onStatus,
  onDelete,
}: {
  request: MaintenanceRequest;
  canManage: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  const hasTransition = MAINTENANCE_TRANSITIONS[request.estado].length > 0;
  return (
    <View style={styles.rowActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalle de ${request.codigo_solicitud}`} onPress={onDetail} style={styles.iconButton}>
        <Eye color={colors.textMuted} size={15} />
      </Pressable>
      {canManage ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${request.codigo_solicitud}`} onPress={onEdit} style={styles.iconButton}>
            <Pencil color={colors.textMuted} size={15} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cambiar estado de ${request.codigo_solicitud}`}
            disabled={!hasTransition}
            onPress={onStatus}
            style={[styles.iconButton, !hasTransition && styles.iconDisabled]}
          >
            <ArrowRightCircle color={colors.info} size={15} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${request.codigo_solicitud}`} onPress={onDelete} style={[styles.iconButton, styles.iconButtonDanger]}>
            <Trash2 color={colors.danger} size={15} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function RequestRow({
  request,
  canManage,
  onDetail,
  onEdit,
  onStatus,
  onDelete,
}: {
  request: MaintenanceRequest;
  canManage: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.colCode}>
        <Text style={styles.code}>{request.codigo_solicitud}</Text>
      </View>
      <View style={styles.colEquipment}>
        <Text numberOfLines={1} style={styles.equipmentName}>{request.equipo}</Text>
        <Text numberOfLines={1} style={styles.equipmentMeta}>{request.equipo_codigo} · {request.equipo_ubicacion}</Text>
      </View>
      <View style={styles.colApplicant}>
        <Text numberOfLines={1} style={styles.applicant}>{request.solicitante}</Text>
      </View>
      <View style={styles.colPriority}>
        <PriorityBadge priority={request.prioridad} />
      </View>
      <View style={styles.colStatus}>
        <StatusBadge status={request.estado} />
      </View>
      <Text style={styles.colDate}>{formatDate(request.fecha_registro)}</Text>
      <View style={styles.colActions}>
        <RequestActions
          request={request}
          canManage={canManage}
          onDelete={onDelete}
          onDetail={onDetail}
          onEdit={onEdit}
          onStatus={onStatus}
        />
      </View>
    </View>
  );
}

function RequestCard({
  request,
  canManage,
  onDetail,
  onEdit,
  onStatus,
  onDelete,
}: {
  request: MaintenanceRequest;
  canManage: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.mobileCard}>
      <View style={styles.mobileTop}>
        <View style={styles.mobileIdentity}>
          <Text style={styles.code}>{request.codigo_solicitud}</Text>
          <Text numberOfLines={2} style={styles.equipmentName}>{request.equipo}</Text>
          <Text numberOfLines={1} style={styles.equipmentMeta}>{request.equipo_codigo} · {request.equipo_ubicacion}</Text>
        </View>
        <StatusBadge status={request.estado} />
      </View>

      <Text numberOfLines={2} style={styles.mobileDescription}>{request.descripcion}</Text>

      <View style={styles.mobileMetrics}>
        <View>
          <Text style={styles.mobileMetricLabel}>SOLICITANTE</Text>
          <Text numberOfLines={1} style={styles.mobileMetricValue}>{request.solicitante}</Text>
        </View>
        <View>
          <Text style={styles.mobileMetricLabel}>PRIORIDAD</Text>
          <PriorityBadge priority={request.prioridad} />
        </View>
        <View>
          <Text style={styles.mobileMetricLabel}>REGISTRO</Text>
          <Text style={styles.mobileMetricValue}>{formatDate(request.fecha_registro)}</Text>
        </View>
      </View>

      <RequestActions
        request={request}
        canManage={canManage}
        onDelete={onDelete}
        onDetail={onDetail}
        onEdit={onEdit}
        onStatus={onStatus}
      />
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

function DetailDialog({
  request,
  canManage,
  onClose,
  onEdit,
  onStatus,
  onDelete,
}: {
  request: MaintenanceRequest | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (request: MaintenanceRequest) => void;
  onStatus: (request: MaintenanceRequest) => void;
  onDelete: (request: MaintenanceRequest) => void;
}) {
  const transitions = request ? MAINTENANCE_TRANSITIONS[request.estado] : [];
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(request)}>
      <View style={styles.dialogBackdrop}>
        <View accessibilityRole="alert" style={styles.dialog}>
          {request ? (
            <>
              <View style={styles.dialogHeading}>
                <View style={styles.dialogHeadingCopy}>
                  <Text style={styles.eyebrow}>DETALLE DE SOLICITUD</Text>
                  <Text style={styles.dialogTitle}>{request.codigo_solicitud}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle" onPress={onClose} style={styles.close}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.dialogScroll} contentContainerStyle={styles.detailBody}>
                <View style={styles.detailBadges}>
                  <StatusBadge status={request.estado} />
                  <PriorityBadge priority={request.prioridad} />
                </View>

                <DetailField label="Equipo" value={`${request.equipo_codigo} · ${request.equipo}`} />
                <DetailField label="Ubicación" value={request.equipo_ubicacion} />
                <DetailField label="Solicitante" value={request.solicitante} />
                <DetailField label="Descripción" value={request.descripcion} />
                <DetailField label="Fecha de registro" value={formatDate(request.fecha_registro)} />
                <DetailField label="Última actualización" value={formatDate(request.fecha_actualizacion)} />
                <DetailField
                  label="Transiciones disponibles"
                  value={transitions.length
                    ? transitions.map((status) => MAINTENANCE_STATUS_LABEL[status]).join(' · ')
                    : 'Estado final: no admite más cambios'}
                />
              </ScrollView>

              <View style={styles.dialogActions}>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cerrar</Text>
                </Pressable>
                {canManage ? (
                  <>
                    <Pressable accessibilityRole="button" onPress={() => onEdit(request)} style={styles.secondaryButton}>
                      <Pencil color={colors.textMuted} size={14} />
                      <Text style={styles.secondaryText}>Editar</Text>
                    </Pressable>
                    {transitions.length ? (
                      <Pressable accessibilityRole="button" onPress={() => onStatus(request)} style={styles.secondaryButton}>
                        <ArrowRightCircle color={colors.info} size={14} />
                        <Text style={[styles.secondaryText, styles.secondaryInfo]}>Estado</Text>
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityRole="button" onPress={() => onDelete(request)} style={styles.dangerButton}>
                      <Trash2 color={colors.danger} size={14} />
                      <Text style={styles.dangerText}>Eliminar</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function StatusDialog({
  request,
  changing,
  onClose,
  onChange,
}: {
  request: MaintenanceRequest | null;
  changing: boolean;
  onClose: () => void;
  onChange: (status: MaintenanceStatus) => void;
}) {
  const transitions = request ? MAINTENANCE_TRANSITIONS[request.estado] : [];
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(request)}>
      <View style={styles.dialogBackdrop}>
        <View accessibilityRole="alert" style={styles.dialog}>
          {request ? (
            <>
              <View style={styles.dialogHeading}>
                <View style={styles.dialogHeadingCopy}>
                  <Text style={styles.eyebrow}>CAMBIAR ESTADO</Text>
                  <Text style={styles.dialogTitle}>{request.codigo_solicitud}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Cerrar cambio de estado" onPress={onClose} style={styles.close}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.dialogMessage}>
                Estado actual: {MAINTENANCE_STATUS_LABEL[request.estado]}. Selecciona una transición permitida.
                Los estados RESUELTA y CANCELADA son finales.
              </Text>

              <View style={styles.transitionList}>
                {transitions.map((status) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={changing}
                    key={status}
                    onPress={() => onChange(status)}
                    style={({ pressed }) => [
                      styles.transitionButton,
                      pressed && styles.pressed,
                      changing && styles.disabled,
                    ]}
                  >
                    <Text style={styles.transitionLabel}>{MAINTENANCE_STATUS_LABEL[status]}</Text>
                    {changing ? <ActivityIndicator color={colors.accent} size="small" /> : (
                      <ArrowRightCircle color={colors.accent} size={17} />
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={styles.dialogActions}>
                <Pressable accessibilityRole="button" disabled={changing} onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
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
      <View style={styles.dialogBackdrop}>
        <View accessibilityRole="alert" style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" disabled={confirming} onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={confirming} onPress={onConfirm} style={styles.dangerSolid}>
              {confirming ? <ActivityIndicator color={colors.background} size="small" /> : (
                <Text style={styles.dangerSolidText}>Eliminar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 1320,
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

  filtersRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  filtersRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  filterField: { flex: 1, gap: 6, minWidth: 160 },
  filterLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  clearButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  clearText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryChip: {
    flex: 1,
    minWidth: 150,
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
  summaryWarning: { color: colors.warning },
  summaryInfo: { color: colors.info },

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
  colCode: { flex: 1.5, minWidth: 0 },
  colEquipment: { flex: 2.2, minWidth: 0 },
  colApplicant: { flex: 1.4, minWidth: 0 },
  colPriority: { flex: 0.9, minWidth: 0 },
  colStatus: { flex: 1.1, minWidth: 0 },
  colDate: { flex: 1.2, minWidth: 0 },
  colActions: { width: 168, alignItems: 'flex-end' },
  alignRight: { textAlign: 'right' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },

  code: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: undefined,
  },
  equipmentName: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  equipmentMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  applicant: { color: colors.text, fontSize: 12, fontWeight: '600' },
  mobileDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },

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
  badgeText: { fontSize: 10, fontWeight: '800' },
  priorityHigh: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  priorityHighText: { color: colors.danger },
  priorityMedium: { backgroundColor: colors.warningSoft, borderColor: 'rgba(245, 158, 11, 0.3)' },
  priorityMediumText: { color: colors.warning },
  priorityLow: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  priorityLowText: { color: colors.accent },
  statusPending: { backgroundColor: colors.warningSoft, borderColor: 'rgba(245, 158, 11, 0.3)' },
  statusPendingText: { color: colors.warning },
  statusInProgress: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  statusInProgressText: { color: colors.info },
  statusResolved: { backgroundColor: colors.accentSoft, borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusResolvedText: { color: colors.accent },
  statusCancelled: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(244, 63, 94, 0.3)' },
  statusCancelledText: { color: colors.danger },

  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  iconButtonDanger: { backgroundColor: colors.dangerSoft },
  iconDisabled: { opacity: 0.35 },

  mobileCard: {
    padding: 15,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 49, 73, 0.55)',
  },
  mobileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  mobileIdentity: { flex: 1, minWidth: 0, gap: 5 },
  mobileMetrics: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  mobileMetricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  mobileMetricValue: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: 170 },

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

  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  dialog: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  dialogHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dialogHeadingCopy: { flex: 1, minWidth: 0 },
  dialogTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 5 },
  close: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 23, lineHeight: 26 },
  dialogMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  dialogScroll: { flexGrow: 0 },
  detailBody: { gap: 12, paddingVertical: 4 },
  detailBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailField: { gap: 3 },
  detailLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 13, lineHeight: 19 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 9, marginTop: 6 },
  transitionList: { gap: 9 },
  transitionButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: colors.accentSoft,
  },
  transitionLabel: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  cancelButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  secondaryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  secondaryText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  secondaryInfo: { color: colors.info },
  dangerButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    backgroundColor: colors.dangerSoft,
  },
  dangerText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  dangerSolid: { minHeight: 40, minWidth: 104, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.danger },
  dangerSolidText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
