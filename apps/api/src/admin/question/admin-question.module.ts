import { Module } from '@nestjs/common';
import { AdminQuestionController } from './admin-question.controller';

@Module({
  controllers: [AdminQuestionController],
})
export class AdminQuestionModule {}
