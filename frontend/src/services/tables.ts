import { apiRequest } from './api';

export type Branch = {
  id_sucursal: number | string;
  nombre: string;
  estado: boolean;
};

export type Table = {
  id_mesa: number | string;
  numero_mesa: string;
  tipo_mesa: string;
  tarifa_minuto: number;
  estado: 'libre' | 'ocupada' | 'mantenimiento';
  id_sucursal: number | string;
  creado_en?: string;
};

export type TableInput = {
  numero_mesa: string;
  tipo_mesa: string;
  tarifa_minuto: number;
  id_sucursal: number;
  estado?: 'libre' | 'mantenimiento';
};

export type TableSession = {
  id_sesion: number | string;
  id_mesa: number | string;
  numero_mesa: string;
  id_sucursal: number | string;
  id_usuario: number | string;
  tarifa_minuto: number;
  hora_inicio: string;
  hora_fin: string | null;
  pausada_en: string | null;
  segundos_pausa: number;
  minutos_totales: number | null;
  total_tiempo: number | null;
  estado: 'activa' | 'pausada' | 'finalizada';
};

export type SessionStartInput = {
  id_mesa: number;
  id_usuario: number;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listBranches(): Promise<Branch[]> {
  const response = await apiRequest<CollectionResponse<Branch>>('/sucursales');
  return response.data;
}

export async function listTables(branchId: number | string): Promise<Table[]> {
  const response = await apiRequest<CollectionResponse<Table>>(
    `/mesas?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function listSessions(branchId: number | string): Promise<TableSession[]> {
  const response = await apiRequest<CollectionResponse<TableSession>>(
    `/sesiones?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function listActiveSessions(branchId: number | string): Promise<TableSession[]> {
  const response = await apiRequest<CollectionResponse<TableSession>>(
    `/sesiones/activas?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function createTable(input: TableInput): Promise<Table> {
  const response = await apiRequest<ItemResponse<Table>>('/mesas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateTable(id: number | string, input: TableInput): Promise<Table> {
  const response = await apiRequest<ItemResponse<Table>>(`/mesas/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createSession(input: SessionStartInput): Promise<TableSession> {
  const response = await apiRequest<ItemResponse<TableSession>>('/sesiones', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function pauseSession(id: number | string): Promise<TableSession> {
  const response = await apiRequest<ItemResponse<TableSession>>(
    `/sesiones/${encodeURIComponent(String(id))}/pausar`,
    { method: 'PATCH' },
  );
  return response.data;
}

export async function resumeSession(id: number | string): Promise<TableSession> {
  const response = await apiRequest<ItemResponse<TableSession>>(
    `/sesiones/${encodeURIComponent(String(id))}/reanudar`,
    { method: 'PATCH' },
  );
  return response.data;
}

export async function finishSession(id: number | string): Promise<TableSession> {
  const response = await apiRequest<ItemResponse<TableSession>>(
    `/sesiones/${encodeURIComponent(String(id))}/finalizar`,
    { method: 'PATCH' },
  );
  return response.data;
}
