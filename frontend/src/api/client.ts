const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** True once a real backend base URL has been configured via VITE_API_BASE_URL. */
export function hasApiBackend(): boolean {
  return API_BASE_URL.length > 0;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Thin fetch wrapper for the real backend. Every service module in src/api
 * calls this first and falls back to the in-memory mock store (src/mock)
 * when no backend is configured yet, or the request fails — so the app
 * stays demoable while the endpoints are being built out.
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!hasApiBackend()) {
    throw new ApiError('API backend not configured', 0);
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed with ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
