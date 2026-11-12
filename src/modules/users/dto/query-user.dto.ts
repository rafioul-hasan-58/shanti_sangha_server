import { ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup, MembershipType, Role, UserStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryUserDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Invalid role' })
  role?: Role;

  @ApiPropertyOptional({
    description: 'Filter by account status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid user status' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Filter by membership type',
    enum: MembershipType,
  })
  @IsOptional()
  @IsEnum(MembershipType, { message: 'Invalid membership type' })
  membershipType?: MembershipType;

  @ApiPropertyOptional({
    description: 'Filter by blood group',
    enum: BloodGroup,
  })
  @IsOptional()
  @IsEnum(BloodGroup, { message: 'Invalid blood group' })
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({
    description: 'Filter by email verification status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description:
      'Search keyword matching fullName, email, phoneNumber, village, profession, or currentLocation',
    example: 'Sourav',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'fullName', 'email', 'role', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'fullName', 'email', 'role', 'status'])
  sortBy?:
    'createdAt' | 'updatedAt' | 'fullName' | 'email' | 'role' | 'status' =
    'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
