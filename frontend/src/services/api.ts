import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();

  // A configured URL is used as-is, unless it points to loopback (127.0.0.1 /
  // localhost). On Android that would target the phone itself, so we ignore it
  // and fall back to auto-detection below.
  if (configured && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  // In development, Expo exposes the Metro host (e.g. "192.168.1.103:8081").
  // The backend runs on the same machine, so reuse that IP with port 3000.
  const devHostUri = Constants.expoConfig?.hostUri
    ?? (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  const devHost = devHostUri?.split(':')[0]?.trim();
  if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
    return `http://${devHost}:${API_PORT}/api`;
  }

  // Android emulator maps the host machine loopback to 10.0.2.2.
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}/api`;
  return `http://127.0.0.1:${API_PORT}/api`;
}

const apiBaseUrl = resolveApiBaseUrl();
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'El servidor tardó demasiado en responder. Verifica la conexión con el backend y la base de datos.',
        0,
        'NETWORK_TIMEOUT',
      );
    }
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que el backend esté activo y que la URL de API sea accesible desde este dispositivo.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => null) as ApiErrorResponse | T | null;
  if (!response.ok) {
    const apiError = body && typeof body === 'object' && 'error' in body
      ? body.error
      : undefined;
    throw new ApiError(
      apiError?.message || 'El servidor no pudo completar la solicitud.',
      response.status,
      apiError?.code || 'HTTP_ERROR',
    );
  }

  if (body === null) {
    throw new ApiError('El servidor devolvió una respuesta inválida.', response.status, 'INVALID_RESPONSE');
  }
  return body as T;
}

export const API_BASE_URL = apiBaseUrl;
