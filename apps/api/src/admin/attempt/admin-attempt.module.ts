import { Module } from '@nestjs/common';
import { AdminAttemptController } from './admin-attempt.controller';

@Module({ controllers: [AdminAttemptController] })
export class AdminAttemptModule {}
