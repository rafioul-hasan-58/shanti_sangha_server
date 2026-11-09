import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google JWT token from Google Sign-In',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsNotEmpty({ message: 'Google token is required' })
  @IsString()
  token: string;
}
