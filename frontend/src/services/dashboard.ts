import { apiRequest } from './api';
import type { Branch } from './products';

export type DashboardSummary = {
  tables: {
    mesas_libres: number;
    mesas_ocupadas: number;
    mesas_mantenimiento: number;
    mesas_total: number;
  };
  sessions: Array<{
    id_sesion: number | string;
    id_mesa: number | string;
    numero_mesa: string;
    tipo_mesa: string;
    id_usuario: number | string;
    nombre_usuario: string;
    tarifa_minuto: number | string;
    hora_inicio: string;
    pausada_en: string | null;
    segundos_pausa: number;
    estado: 'activa' | 'pausada';
    segundos_transcurridos: number;
    costo_estimado: number | string;
    consumo_pos: number | string;
  }>;
  sales: {
    cantidad: number;
    total: number | string;
    ventas_directas: number | string;
    consumos_mesa: number | string;
  };
  cash: {
    turnos_abiertos: number;
    base_abierta: number | string;
    efectivo_esperado: number | string;
  };
  income: {
    alquileres: number | string;
    productos: number | string;
    total: number | string;
  };
  recentSales: Array<{
    id_venta: number | string;
    fecha_venta: string;
    tipo_venta: 'directa' | 'mesa';
    total_productos: number | string;
    id_sesion: number | string | null;
    nombre_usuario: string;
  }>;
};

type ItemResponse<T> = { data: T };
type CollectionResponse<T> = { data: T[] };

export type BranchOperator = {
  id_usuario: number | string;
  nombre: string;
  rol: 'admin_sucursal' | 'cajero';
};

export async function getDashboardSummary(branchId: number | string): Promise<DashboardSummary> {
  const query = new URLSearchParams({ id_sucursal: String(branchId) });
  const response = await apiRequest<ItemResponse<DashboardSummary>>(`/dashboard?${query}`);
  return response.data;
}

export async function listDashboardBranches(): Promise<Branch[]> {
  const response = await apiRequest<CollectionResponse<Branch>>('/sucursales');
  return response.data;
}

export async function listBranchOperators(branchId: number | string): Promise<BranchOperator[]> {
  const query = new URLSearchParams({ id_sucursal: String(branchId) });
  const response = await apiRequest<CollectionResponse<BranchOperator>>(`/usuarios?${query}`);
  return response.data;
}
