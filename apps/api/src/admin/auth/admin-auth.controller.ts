import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard, type AdminReq } from './admin.guard';
import { baseCookie } from '../../common/utils/cookie';

class LoginDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @IsNotEmpty() password!: string;
  @IsString() @IsOptional() mfaCode?: string;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly svc: AdminAuthService) {}

  // Login is abuse-sensitive: 10 attempts per minute per IP is ample
  // for legitimate admins and blocks credential-stuffing bursts.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.svc.login({
      username: dto.username,
      password: dto.password,
      mfaCode: dto.mfaCode,
      ip,
      ua,
    });
    res.cookie('od_admin', r.token, baseCookie());
    return r;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('od_admin', { path: '/' });
  }

  @UseGuards(AdminGuard)
  @Get('me')
  me(@Req() req: AdminReq) {
    return { adminId: req.admin!.sub, roles: req.admin!.roles };
  }
}
