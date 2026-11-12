import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Registered email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: '6-digit OTP code sent to your email',
    example: '482910',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be a 6-digit code' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain 6 digits' })
  otp: string;
}
