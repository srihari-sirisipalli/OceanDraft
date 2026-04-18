import { Module } from '@nestjs/common';
import { AdminCategoryController } from './admin-category.controller';

@Module({ controllers: [AdminCategoryController] })
export class AdminCategoryModule {}
