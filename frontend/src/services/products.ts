import { apiRequest } from './api';

export type Branch = {
  id_sucursal: number | string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  estado: boolean;
};

export type Product = {
  id_producto: number | string;
  nombre: string;
  precio_venta: number | string;
  stock: number;
  stock_minimo: number;
  id_sucursal: number | string;
  categoria: string | null;
};

export type ProductInput = {
  nombre: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  id_sucursal: number;
  categoria: string | null;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listBranches(): Promise<Branch[]> {
  const response = await apiRequest<CollectionResponse<Branch>>('/sucursales');
  return response.data;
}

export async function listProducts(branchId: number | string): Promise<Product[]> {
  const response = await apiRequest<CollectionResponse<Product>>(
    `/productos?id_sucursal=${encodeURIComponent(String(branchId))}`,
  );
  return response.data;
}

export async function createProduct(product: ProductInput): Promise<Product> {
  const response = await apiRequest<ItemResponse<Product>>('/productos', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  return response.data;
}

export async function updateProduct(id: number | string, product: ProductInput): Promise<Product> {
  const response = await apiRequest<ItemResponse<Product>>(`/productos/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  return response.data;
}

export async function deactivateProduct(id: number | string): Promise<Product> {
  const response = await apiRequest<ItemResponse<Product>>(`/productos/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
  return response.data;
}
