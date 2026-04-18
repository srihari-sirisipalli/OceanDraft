import type { CookieOptions } from 'express';

/**
 * Base cookie options. `secure: true` is gated on COOKIE_SECURE=true
 * (not on NODE_ENV) so "production mode on a laptop over http" still works.
 * Set COOKIE_SECURE=true only when the server actually sits behind HTTPS.
 */
export function baseCookie(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}
