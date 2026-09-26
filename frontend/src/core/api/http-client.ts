import { runtimeEnv } from '@/core/config';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the server could not be reached at all. */
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Machine-readable reason sent by the API (`{ message: { code } }`), e.g. `unauthenticated`, `database_unavailable`. */
  get code(): string | null {
    const message = (this.body as { message?: unknown } | undefined)?.message;
    const code = typeof message === 'object' && message !== null ? (message as { code?: unknown }).code : undefined;
    return typeof code === 'string' ? code : null;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * Thin typed wrapper around `fetch`. Authentication is the HttpOnly session
 * cookie set by the backend — this module never sees or stores a token.
 * `credentials: 'include'` keeps working if the API is ever served from a
 * sibling origin of the same site.
 */
async function request<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(`${runtimeEnv.apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(`Network error: ${method} ${path}`, 0);
  }

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

/** Absolute URL of a backend route the browser must *navigate* to (Microsoft sign-in / consent). */
export function apiUrl(path: string): string {
  return `${runtimeEnv.apiBaseUrl}${path}`;
}
