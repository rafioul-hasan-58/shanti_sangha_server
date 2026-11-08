import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BloodGroup, MembershipType } from '@prisma/client';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @ValidateIf((o: RegisterDto) => !o.name)
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Alternative alias for fullName',
    example: 'John Doe',
  })
  @ValidateIf((o: RegisterDto) => !o.fullName)
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password of the user (minimum 6 characters)',
    example: 'securePassword123',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

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
  MembershipType?: MembershipType;

  @ApiPropertyOptional({
    enum: MembershipType,
    description: 'Lowercase alias for MembershipType',
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

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
