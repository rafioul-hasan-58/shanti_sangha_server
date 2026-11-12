import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

export class UpdateUserDto extends UpdateProfileDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'Role assigned to the user',
    example: Role.USER,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role' })
  role?: Role;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Account status of the user',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Whether the user email is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'emailVerified must be a boolean' })
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user phone number is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'phoneVerified must be a boolean' })
  phoneVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user is verified by an admin',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'adminVerified must be a boolean' })
  adminVerified?: boolean;
}
