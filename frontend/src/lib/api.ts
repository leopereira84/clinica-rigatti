import { tokenStorage } from './tokenStorage';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Error returned by the API in the format `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

let onUnauthorized: (() => void) | null = null;

/** Called when an authenticated request gets 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toApiError(status: number, payload: unknown): ApiError {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const { error } = payload as { error: { code?: unknown; message?: unknown; details?: unknown } };
    if (typeof error.code === 'string') {
      return new ApiError(status, error.code, String(error.message ?? ''), error.details);
    }
  }
  return new ApiError(status, status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR', 'Unexpected response');
}

/**
 * Typed fetch wrapper for the backend API. Response bodies are trusted to
 * match the backend contract (the generic parameter documents that shape).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

export { isAbortError };
