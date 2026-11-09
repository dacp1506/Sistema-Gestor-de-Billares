const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const apiBaseUrl = (configuredApiUrl || 'http://127.0.0.1:3000/api').replace(/\/+$/, '');
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
