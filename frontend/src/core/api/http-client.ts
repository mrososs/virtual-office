import { runtimeEnv } from '@/core/config';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thin typed wrapper around `fetch`. Auth token injection is added by
 * `core/auth` via `setAuthTokenProvider` so this module has no circular
 * dependency on the auth store.
 */
let authTokenProvider: (() => string | null) | null = null;

export function setAuthTokenProvider(provider: () => string | null): void {
  authTokenProvider = provider;
}

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  const token = authTokenProvider?.() ?? null;

  const response = await fetch(`${runtimeEnv.apiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = undefined;
    }
    throw new ApiError(`Request failed: ${method} ${path} (${response.status})`, response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const httpClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) =>
    request<TResponse>('GET', path, undefined, options),
  post: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>('POST', path, body, options),
  put: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>('PUT', path, body, options),
  patch: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>('PATCH', path, body, options),
  delete: <TResponse>(path: string, options?: ApiRequestOptions) =>
    request<TResponse>('DELETE', path, undefined, options),
};
