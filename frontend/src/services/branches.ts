import { apiRequest } from './api';

export type Branch = {
  id_sucursal: number | string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado: boolean;
  creado_en?: string;
};

export type BranchInput = {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado?: boolean;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listBranches(includeInactive = false): Promise<Branch[]> {
  const query = includeInactive ? '?inactivas=true' : '';
  const response = await apiRequest<CollectionResponse<Branch>>(`/sucursales${query}`);
  return response.data;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const response = await apiRequest<ItemResponse<Branch>>('/sucursales', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateBranch(id: number | string, input: BranchInput): Promise<Branch> {
  const response = await apiRequest<ItemResponse<Branch>>(`/sucursales/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function deactivateBranch(id: number | string): Promise<Branch> {
  const response = await apiRequest<ItemResponse<Branch>>(`/sucursales/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
  return response.data;
}
