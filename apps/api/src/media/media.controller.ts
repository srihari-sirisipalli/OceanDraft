import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { S3Service } from '../common/s3/s3.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=3600')
  async get(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.isDeleted) throw new NotFoundException();
    const out = await this.s3.getStream(asset.storageKey);
    if (out.contentType) res.setHeader('Content-Type', out.contentType);
    if (out.contentLength) res.setHeader('Content-Length', out.contentLength);
    out.stream.pipe(res);
  }
}
