import { apiRequest } from './api';

export type SaleItemInput = {
  id_producto: number;
  cantidad: number;
};

export type SaleInput = {
  id_sucursal: number;
  id_usuario: number;
  tipo_venta: 'directa' | 'mesa';
  id_sesion?: number | null;
  items: SaleItemInput[];
};

export type Sale = {
  id_venta: number | string;
  fecha_venta: string;
  tipo_venta: 'directa' | 'mesa';
  total_productos: number;
  id_sesion?: number | null;
  id_sucursal: number | string;
  id_usuario: number | string;
  detalles?: Array<{
    id_detalle: number;
    id_producto: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    nombre?: string;
  }>;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listSales(branchId: number | string): Promise<Sale[]> {
  const response = await apiRequest<CollectionResponse<Sale>>(
    `/ventas?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function createSale(input: SaleInput): Promise<Sale> {
  const response = await apiRequest<ItemResponse<Sale>>('/ventas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}
