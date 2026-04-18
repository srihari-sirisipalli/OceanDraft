import { Module } from '@nestjs/common';
import { AttemptModule } from '../attempt/attempt.module';
import { ResultController } from './result.controller';

@Module({
  imports: [AttemptModule],
  controllers: [ResultController],
})
export class ResultModule {}
