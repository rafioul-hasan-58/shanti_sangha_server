import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'admin@shantisangha.com',
  })
  @IsEmail({}, { message: 'Invalid Email Address!' })
  email: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'Admin@123456',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
