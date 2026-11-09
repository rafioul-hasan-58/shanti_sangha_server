import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiPropertyOptional({
    description: 'Google JWT token from Google Sign-In',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description:
      'Google JWT credential from Google One Tap / Identity Services',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsOptional()
  @IsString()
  credential?: string;

  @ApiPropertyOptional({
    description: 'Google ID token (alias for token/credential)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    description: 'Raw JWT token (alias)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsOptional()
  @IsString()
  jwt?: string;

  @ApiPropertyOptional({
    description: 'Google OAuth access token',
    example: 'ya29.a0AfH6SM...',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'User email (optional if JWT token is provided)',
    example: 'john.doe@gmail.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Full name of the user from Google profile',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL from Google',
    example: 'https://lh3.googleusercontent.com/a/ACg8oc...',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Google account unique sub/ID',
    example: '1098234710923847',
  })
  @IsOptional()
  @IsString()
  googleId?: string;
}
