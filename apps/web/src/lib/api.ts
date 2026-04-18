const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export type ApiError = {
  code: string;
  message: string;
  correlationId?: string;
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    (path.startsWith('/admin/') || path.includes('/admin/'))
  ) {
    const token = readCookie('od_csrf');
    if (token) headers['x-csrf-token'] = token;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
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
