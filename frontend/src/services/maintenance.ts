import { apiRequest } from './api';

export type MaintenanceEquipment = {
  id_equipo: number | string;
  codigo: string;
  nombre: string;
  ubicacion: string;
  estado: 'OPERATIVO' | 'FUERA_DE_SERVICIO' | 'MANTENIMIENTO';
  id_sucursal: number | string;
  creado_en?: string;
};

export type MaintenancePriority = 'BAJA' | 'MEDIA' | 'ALTA';
export type MaintenanceStatus = 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTA' | 'CANCELADA';

export type MaintenanceRequest = {
  id_solicitud: number | string;
  codigo_solicitud: string;
  id_equipo: number | string;
  id_sucursal: number | string;
  solicitante: string;
  descripcion: string;
  prioridad: MaintenancePriority;
  estado: MaintenanceStatus;
  fecha_registro: string;
  fecha_actualizacion: string;
  activo: boolean;
  equipo_codigo: string;
  equipo: string;
  equipo_ubicacion: string;
  equipo_estado: MaintenanceEquipment['estado'];
};

export type MaintenanceFilters = {
  q?: string;
  prioridad?: MaintenancePriority | '';
  estado?: MaintenanceStatus | '';
};

export type MaintenanceRequestInput = {
  id_equipo: number;
  id_sucursal?: number;
  solicitante: string;
  descripcion: string;
  prioridad: MaintenancePriority;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listMaintenanceEquipment(branchId: number | string): Promise<MaintenanceEquipment[]> {
  const response = await apiRequest<CollectionResponse<MaintenanceEquipment>>(
    `/equipos?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function listMaintenanceRequests(
  branchId: number | string,
  filters: MaintenanceFilters = {},
): Promise<MaintenanceRequest[]> {
  const params = new URLSearchParams({ id_sucursal: String(branchId) });
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.prioridad) params.set('prioridad', filters.prioridad);
  if (filters.estado) params.set('estado', filters.estado);

  const response = await apiRequest<CollectionResponse<MaintenanceRequest>>(
    `/solicitudes?${params.toString()}`,
  );
  return response.data;
}

export async function getMaintenanceRequest(id: number | string): Promise<MaintenanceRequest> {
  const response = await apiRequest<ItemResponse<MaintenanceRequest>>(
    `/solicitudes/${encodeURIComponent(String(id))}`,
  );
  return response.data;
}

export async function createMaintenanceRequest(input: MaintenanceRequestInput): Promise<MaintenanceRequest> {
  const response = await apiRequest<ItemResponse<MaintenanceRequest>>('/solicitudes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateMaintenanceRequest(
  id: number | string,
  input: MaintenanceRequestInput,
): Promise<MaintenanceRequest> {
  const response = await apiRequest<ItemResponse<MaintenanceRequest>>(
    `/solicitudes/${encodeURIComponent(String(id))}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data;
}

export async function changeMaintenanceRequestStatus(
  id: number | string,
  estado: MaintenanceStatus,
): Promise<MaintenanceRequest> {
  const response = await apiRequest<ItemResponse<MaintenanceRequest>>(
    `/solicitudes/${encodeURIComponent(String(id))}/estado`,
    { method: 'PATCH', body: JSON.stringify({ estado }) },
  );
  return response.data;
}

export async function deleteMaintenanceRequest(id: number | string): Promise<void> {
  await apiRequest<ItemResponse<{ id_solicitud: number | string; activo: false }>>(
    `/solicitudes/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
  );
}

export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['RESUELTA', 'CANCELADA'],
  RESUELTA: [],
  CANCELADA: [],
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  CANCELADA: 'Cancelada',
};
