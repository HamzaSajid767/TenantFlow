export type ApiError = {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
};

export function errorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const baseUrl = import.meta.env.VITE_API_URL ?? '';

async function parseError(response: Response): Promise<ApiError> {
  try {
    return (await response.json()) as ApiError;
  } catch {
    return {
      statusCode: response.status,
      code: 'INTERNAL_ERROR',
      message: response.statusText,
    };
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    setAccessToken(null);
    return false;
  }
  const body = (await response.json()) as { accessToken: string };
  setAccessToken(body.accessToken);
  return true;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
