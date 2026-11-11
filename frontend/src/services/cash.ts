import { apiRequest } from './api';

export type CashShift = {
  id_caja: number | string;
  id_sucursal: number | string;
  id_usuario: number | string;
  nombre_usuario?: string;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  monto_inicial: number;
  total_calculado: number;
  ingresos_alquiler?: number;
  ingresos_pos?: number;
  monto_declarado: number | null;
  estado: 'abierta' | 'cerrada';
};

export type CashShiftInput = {
  id_sucursal: number;
  id_usuario: number;
  monto_inicial: number;
};

export type CashCloseInput = {
  monto_declarado: number;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

export async function listCashShifts(branchId?: number | string, userId?: number | string): Promise<CashShift[]> {
  const params = new URLSearchParams();
  if (branchId != null && branchId !== '') params.set('id_sucursal', String(branchId));
  if (userId != null && userId !== '') params.set('id_usuario', String(userId));

  const path = params.toString() ? `/caja?${params.toString()}` : '/caja';
  const response = await apiRequest<CollectionResponse<CashShift>>(path);
  return response.data;
}

export async function openCashShift(input: CashShiftInput): Promise<CashShift> {
  const response = await apiRequest<ItemResponse<CashShift>>('/caja/apertura', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function closeCashShift(id: number | string, input: CashCloseInput): Promise<CashShift> {
  const response = await apiRequest<ItemResponse<CashShift>>(`/caja/${encodeURIComponent(String(id))}/cerrar`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return response.data;
}
