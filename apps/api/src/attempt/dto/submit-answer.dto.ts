import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString() @IsNotEmpty() attemptId!: string;
  // Single-select: provide optionId. Multi-select: provide optionIds.
  @IsString() @IsOptional() optionId?: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) @IsOptional()
  optionIds?: string[];
  @IsString() @IsNotEmpty() clientNonce!: string;
  @IsString() @IsOptional() clientStartAt?: string;
}
