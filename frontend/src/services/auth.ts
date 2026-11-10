import { apiRequest } from './api';

export type AuthUser = {
  id_usuario: number | string;
  nombre: string;
  username?: string | null;
  email: string | null;
  rol: 'admin_general' | 'admin_sucursal' | 'cajero';
  id_sucursal: number | string | null;
  activo: boolean;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export async function registerAdminGeneral(input: {
  nombre: string;
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
