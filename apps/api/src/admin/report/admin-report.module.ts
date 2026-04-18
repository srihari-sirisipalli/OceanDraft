import { Module } from '@nestjs/common';
import { AdminReportController } from './admin-report.controller';

@Module({ controllers: [AdminReportController] })
export class AdminReportModule {}
