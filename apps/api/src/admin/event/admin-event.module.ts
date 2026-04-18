import { Module } from '@nestjs/common';
import { AdminEventController } from './admin-event.controller';

@Module({ controllers: [AdminEventController] })
export class AdminEventModule {}
