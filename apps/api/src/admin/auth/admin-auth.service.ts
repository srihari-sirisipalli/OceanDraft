import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(params: { username: string; password: string; ip?: string; ua?: string }) {
    const user = await this.prisma.adminUser.findUnique({
      where: { username: params.username },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }
    const ok = await argon2.verify(user.passwordHash, params.password);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.record({
      actorId: user.id,
      actorType: 'ADMIN',
      action: 'LOGIN',
      entityType: 'AdminUser',
      entityId: user.id,
      ip: params.ip,
      ua: params.ua,
    });

    const roles = user.roles.map((r) => r.role.name);
    const token = await this.jwt.signAsync(
      { sub: user.id, roles },
      {
        secret: this.config.get<string>('jwtSecret'),
        expiresIn: `${this.config.get<number>('adminSessionIdleMinutes') ?? 30}m`,
      },
    );
    return {
      token,
      adminId: user.id,
      username: user.username,
      roles,
    };
  }

  async verifyToken(token: string) {
    try {
      return await this.jwt.verifyAsync<{ sub: string; roles: string[] }>(token, {
        secret: this.config.get<string>('jwtSecret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED' });
    }
  }
}
