import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

const CSRF_COOKIE = 'od_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF middleware for admin surface:
 * - Issues a per-session token cookie on any request if missing.
 * - Rejects unsafe admin requests that lack a matching X-CSRF-Token header.
 * - Candidate APIs are unaffected — they use short-lived session cookies and
 *   the server authoritatively validates each step.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let token = req.cookies?.[CSRF_COOKIE] as string | undefined;
    if (!token) {
      token = randomBytes(24).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // readable by the SPA so it can echo in a header
        sameSite: 'lax',
        secure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
        path: '/',
      });
    }
    if (SAFE_METHODS.has(req.method)) return next();
    if (!req.path.startsWith('/api/v1/admin/')) return next();
    if (req.path === '/api/v1/admin/auth/login') return next(); // bootstrap

    const header = req.headers[CSRF_HEADER];
    if (!header || header !== token) {
      res.status(403).json({
        code: 'CSRF_FAILED',
        message: 'CSRF token missing or invalid.',
      });
      return;
    }
    next();
  }
}
