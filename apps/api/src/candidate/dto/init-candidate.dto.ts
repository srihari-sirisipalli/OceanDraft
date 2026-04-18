import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class InitCandidateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile!: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  countryCode?: string;

  @IsBoolean()
  consent!: boolean;
}
