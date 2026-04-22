import {
  Controller,
  Get,
  Header,
  Logger,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { S3Service } from '../common/s3/s3.service';

// Media reads are public, cacheable, and fan out proportionally to the
// number of images a single page renders (e.g. the admin preview
// walkthrough loads ~150). Throttling them behind the 120 rpm default
// breaks legitimate use. They stay safe because they return read-only
// blobs keyed by opaque UUID and honour Cache-Control.
@SkipThrottle()
@Controller('media')
export class MediaController {
  private readonly logger = new Logger('MediaController');

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=3600')
  async get(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.isDeleted) throw new NotFoundException();

    let out: Awaited<ReturnType<S3Service['getStream']>>;
    try {
      out = await this.s3.getStream(asset.storageKey);
    } catch (e) {
      // S3 was unreachable or the key is gone — don't hang the request.
      const err = e as Error;
      this.logger.warn(`media fetch failed for ${id}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          code: 'MEDIA_STREAM_FAIL',
          message: err.message,
        });
      }
      return;
    }

    if (out.contentType) res.setHeader('Content-Type', out.contentType);
    if (out.contentLength) res.setHeader('Content-Length', out.contentLength);

    // Guard the pipe: a mid-stream S3 hiccup would otherwise leave the
    // client hanging until the TCP timeout.
    out.stream.on('error', (err: Error) => {
      this.logger.warn(`media stream error for ${id}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          code: 'MEDIA_STREAM_FAIL',
          message: err.message,
        });
      } else {
        res.destroy(err);
      }
    });
    out.stream.pipe(res);
  }
}
