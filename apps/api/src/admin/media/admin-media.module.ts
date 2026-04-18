import { Module } from '@nestjs/common';
import { AdminMediaController } from './admin-media.controller';

@Module({ controllers: [AdminMediaController] })
export class AdminMediaModule {}
