import { Module } from '@nestjs/common';
import { AdminTemplateController } from './admin-template.controller';

@Module({ controllers: [AdminTemplateController] })
export class AdminTemplateModule {}
