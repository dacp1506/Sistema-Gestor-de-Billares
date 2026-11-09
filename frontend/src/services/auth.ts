import { apiRequest } from './api';

export type AuthUser = {
  id_usuario: number | string;
  nombre: string;
  email: string;
  rol: 'admin_general' | 'admin_sucursal' | 'cajero';
  id_sucursal: number | string | null;
  activo: boolean;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
