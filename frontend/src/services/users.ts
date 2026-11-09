import { apiRequest } from './api';

export type UserRole = 'admin_general' | 'admin_sucursal' | 'cajero';

export type User = {
  id_usuario: number | string;
  nombre: string;
  email: string;
  rol: UserRole;
  id_sucursal: number | string | null;
  activo: boolean;
  creado_en?: string;
};

export type UserInput = {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  id_sucursal?: number | null;
  activo?: boolean;
};

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T; message?: string };

export async function listUsers(branchId?: number | string): Promise<User[]> {
  const query = branchId ? `?id_sucursal=${encodeURIComponent(String(branchId))}` : '';
  const response = await apiRequest<CollectionResponse<User>>(`/usuarios${query}`);
  return response.data;
}

export async function createUser(input: UserInput): Promise<User> {
  const response = await apiRequest<ItemResponse<User>>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateUser(id: number | string, input: Partial<UserInput>): Promise<User> {
  const response = await apiRequest<ItemResponse<User>>(`/usuarios/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function deactivateUser(id: number | string): Promise<User> {
  const response = await apiRequest<ItemResponse<User>>(`/usuarios/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
  return response.data;
}
