import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  candidateId!: string;
}

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  otpRequestId!: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  otpRequestId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
