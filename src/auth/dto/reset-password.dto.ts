import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Registered email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newSecurePassword123',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @ApiPropertyOptional({
    description:
      '6-digit OTP code (optional if OTP was already verified via /auth/verify-otp)',
    example: '482910',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be a 6-digit code' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain 6 digits' })
  otp?: string;
}
