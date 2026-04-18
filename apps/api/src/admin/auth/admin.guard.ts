import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';

export interface AdminReq extends Request {
  admin?: { sub: string; roles: string[] };
}

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AdminReq>();
    const token =
      (req.cookies?.od_admin as string | undefined) ??
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);
    if (!token) throw new UnauthorizedException({ code: 'ADMIN_AUTH_REQUIRED' });
    const payload = await this.auth.verifyToken(token);
    req.admin = payload;

    const required =
      this.reflector.getAllAndOverride<string[]>(ADMIN_ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];
    if (required.length > 0 && !required.some((r) => payload.roles.includes(r))) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }
    return true;
  }
}
