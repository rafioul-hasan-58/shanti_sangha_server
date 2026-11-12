import { ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup, MembershipType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName?: string;

  @ApiPropertyOptional({
    description: "Father's name",
    example: 'Richard Doe',
  })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    description: "Mother's name",
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+8801700000000',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: BloodGroup,
    description: 'Blood group of the user',
    example: BloodGroup.A_POSITIVE,
  })
  @IsOptional()
  @IsEnum(BloodGroup, { message: 'Invalid blood group' })
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({
    description: 'Bio of the user',
    example: 'Active member of Shanti Sangha',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Summary of the user profile',
    example: 'Community organizer and volunteer',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Profession or occupation',
    example: 'Teacher',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    description: 'Village name',
    example: 'Shavarchala',
  })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional({
    description: 'Current address/location',
    example: 'Dhaka, Bangladesh',
  })
  @IsOptional()
  @IsString()
  currentLocation?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp number',
    example: '+8801700000000',
  })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({
    enum: MembershipType,
    description: 'Membership type',
    example: MembershipType.PERMANENT,
  })
  @IsOptional()
  @IsEnum(MembershipType, { message: 'Invalid membership type' })
  membershipType?: MembershipType;

  @ApiPropertyOptional({
    description: 'Facebook profile URL',
    example: 'https://facebook.com/johndoe',
  })
  @IsOptional()
  @IsString()
  facebookProfile?: string;
}
