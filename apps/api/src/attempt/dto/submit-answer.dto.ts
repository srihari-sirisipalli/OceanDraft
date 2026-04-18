import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString() @IsNotEmpty() attemptId!: string;
  @IsString() @IsNotEmpty() optionId!: string;
  @IsString() @IsNotEmpty() clientNonce!: string;
  @IsString() @IsOptional() clientStartAt?: string;
}
