const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export type ApiError = {
  code: string;
  message: string;
  correlationId?: string;
};

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let err: ApiError = { code: 'UNKNOWN', message: res.statusText };
    try {
      err = await res.json();
    } catch {
      /* ignore */
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
