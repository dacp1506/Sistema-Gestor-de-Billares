import { apiRequest } from './api';

export type Reservation = {
  id_reserva: number | string;
  nombre_cliente: string;
  telefono_cliente: string;
  fecha_reserva: string;
  hora_inicio: string;
  duracion_minutos: number;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'atendida';
  id_mesa: number | string;
  numero_mesa?: string;
  tipo_mesa?: string;
  id_sucursal?: number | string;
  nombre_sucursal?: string;
};

export type ReservationInput = {
  nombre_cliente: string;
  telefono_cliente: string;
  fecha_reserva: string;
  hora_inicio: string;
  duracion_minutos: number;
  id_mesa: number;
  estado?: Reservation['estado'];
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

export async function listReservations(branchId?: number | string, date?: string, tableId?: number | string): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (branchId != null && branchId !== '') params.set('id_sucursal', String(branchId));
  if (date) params.set('fecha_reserva', date);
  if (tableId != null && tableId !== '') params.set('id_mesa', String(tableId));

  const path = params.toString() ? `/reservas?${params.toString()}` : '/reservas';
  const response = await apiRequest<CollectionResponse<Reservation>>(path);
  return response.data;
}

export async function createReservation(input: ReservationInput): Promise<Reservation> {
  const response = await apiRequest<ItemResponse<Reservation>>('/reservas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateReservationStatus(id: number | string, estado: Reservation['estado']): Promise<Reservation> {
  const response = await apiRequest<ItemResponse<Reservation>>(`/reservas/${encodeURIComponent(String(id))}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
  return response.data;
}
