import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { randomUUID, createHash } from 'crypto';
import FileType from 'file-type';
import { AdminGuard, AdminRoles, type AdminReq } from '../auth/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';
import { AuditService } from '../../audit/audit.service';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

class UploadMetaDto {
  @IsString() @IsOptional() @MaxLength(300) altText?: string;
}

@UseGuards(AdminGuard)
@AdminRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/media')
export class AdminMediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query('limit') limit = '50') {
    const rows = await this.prisma.mediaAsset.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Number(limit) || 50),
    });
    return {
      rows: rows.map((r) => ({
        id: r.id,
        url: `/api/v1/media/${r.id}`,
        mimeType: r.mimeType,
        altText: r.altText,
        sizeBytes: r.sizeBytes,
        createdAt: r.createdAt,
        originalName: r.originalName,
      })),
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMetaDto,
    @Req() req: AdminReq,
  ) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED' });
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'Max 2 MB.',
      });
    }
    const sniff = await FileType.fromBuffer(file.buffer);
    const mime = sniff?.mime ?? file.mimetype;
    if (!ALLOWED_MIME.includes(mime)) {
      throw new BadRequestException({
        code: 'FILE_TYPE_INVALID',
        message: 'Only PNG, JPEG, or WebP images are allowed.',
      });
    }
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const key = `questions/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.s3.put({ key, body: file.buffer, contentType: mime });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey: key,
        originalName: file.originalname,
        mimeType: mime,
        sizeBytes: file.size,
        checksumSha256: checksum,
        altText: dto.altText ?? null,
        createdById: req.admin!.sub,
      },
    });

    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'media.upload',
      entityType: 'MediaAsset',
      entityId: asset.id,
      after: { storageKey: key, mime, size: file.size, originalName: file.originalname },
    });

    return {
      id: asset.id,
      url: `/api/v1/media/${asset.id}`,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      altText: asset.altText,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AdminReq) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return { ok: true };
    await this.prisma.mediaAsset.update({
      where: { id },
      data: { isDeleted: true },
    });
    await this.audit.record({
      actorId: req.admin!.sub,
      actorType: 'ADMIN',
      action: 'media.delete',
      entityType: 'MediaAsset',
      entityId: id,
      before: asset,
    });
    return { ok: true };
  }
}
