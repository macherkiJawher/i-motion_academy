/**
 * HTTP client for the i-Motion Academy NestJS REST API.
 *
 * The base URL comes from `VITE_API_URL`. While the backend is not yet
 * reachable, services fall back to local fixtures (see `src/api/fixtures.ts`)
 * so that the UI can be developed against the exact same typed contracts.
 */

export const API_BASE_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

/** True when a real backend is configured. */
export const hasApi = Boolean(API_BASE_URL);

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = "imotion.access_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  authenticated = true,
): Promise<T> {
  const token = authenticated ? tokenStore.get() : null;
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (signal) init.signal = signal;
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE_URL}${path}`, init);

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = undefined;
    }
    if (authenticated && res.status === 401) {
      tokenStore.clear();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("imotion:auth-invalid"));
    }
    const message =
      (details as { message?: string } | undefined)?.message ??
      (res.status === 401
        ? "Votre session a expiré. Veuillez vous reconnecter."
        : `Request failed (${res.status})`);
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  postAnonymous: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>("POST", path, body, signal, false),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export async function postForm<T>(path: string, body: FormData): Promise<T> {
  const token = tokenStore.get();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = undefined;
    }
    throw new ApiError(
      (details as { message?: string } | undefined)?.message ??
        `Request failed (${response.status})`,
      response.status,
      details,
    );
  }
  return response.json() as Promise<T>;
}

export async function downloadFile(path: string): Promise<Blob> {
  const token = tokenStore.get();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(`Download failed (${response.status})`, response.status);
  return response.blob();
}

/**
 * Runs the live API call when a backend is configured, otherwise resolves the
 * local fixture with a small latency so loading states are exercised.
 */
export async function withFallback<T>(
  live: () => Promise<T>,
  fixture: () => T,
  delay = 320,
): Promise<T> {
  if (hasApi) return live();
  await new Promise((r) => setTimeout(r, delay));
  return fixture();
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
