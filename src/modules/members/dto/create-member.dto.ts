import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMemberDto {
  @ApiPropertyOptional({
    description:
      'Unique URL-friendly slug (e.g., emon). Auto-generated from nameEn if omitted.',
    example: 'emon',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    description: 'Member name in English',
    example: 'Md. Emon Hasan',
  })
  @IsNotEmpty({ message: 'Name in English is required' })
  @IsString()
  nameEn: string;

  @ApiProperty({
    description: 'Member name in Bengali',
    example: 'মোঃ ইমন হাসান',
  })
  @IsNotEmpty({ message: 'Name in Bengali is required' })
  @IsString()
  nameBn: string;

  @ApiProperty({
    description: 'Designation / role in English',
    example: 'President',
  })
  @IsNotEmpty({ message: 'Role in English is required' })
  @IsString()
  roleEn: string;

  @ApiProperty({
    description: 'Designation / role in Bengali',
    example: 'সভাপতি',
  })
  @IsNotEmpty({ message: 'Role in Bengali is required' })
  @IsString()
  roleBn: string;

  @ApiPropertyOptional({
    description: 'Image URL or path of the member',
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Village name in English',
    example: 'Shavarchala',
  })
  @IsNotEmpty({ message: 'Village in English is required' })
  @IsString()
  villageEn: string;

  @ApiProperty({
    description: 'Village name in Bengali',
    example: 'শাভারচালা',
  })
  @IsNotEmpty({ message: 'Village in Bengali is required' })
  @IsString()
  villageBn: string;

  @ApiProperty({
    description: 'Short summary/bio in English',
    example:
      'Dedicated community leader working for the development of Shavarchala.',
  })
  @IsNotEmpty({ message: 'Summary in English is required' })
  @IsString()
  summaryEn: string;

  @ApiProperty({
    description: 'Short summary/bio in Bengali',
    example: 'শাভারচালার সার্বিক উন্নয়নে নিবেদিতপ্রাণ সমাজকর্মী ও যুবনেতা।',
  })
  @IsNotEmpty({ message: 'Summary in Bengali is required' })
  @IsString()
  summaryBn: string;

  @ApiPropertyOptional({
    description: 'Key contributions in English',
    example: ['Founded local sports club', 'Organized free medical camps'],
    type: [String],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyContributionEn?: string[];

  @ApiPropertyOptional({
    description: 'Key contributions in Bengali',
    example: [
      'স্থানীয় ক্রীড়া ক্লাব প্রতিষ্ঠা',
      'বিনামূল্যে চিকিৎসা ক্যাম্প পরিচালনা',
    ],
    type: [String],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyContributionBn?: string[];

  @ApiPropertyOptional({
    description: 'Personal or leadership motto in English',
    example: 'Service to mankind is service to God.',
  })
  @IsOptional()
  @IsString()
  mottoEn?: string;

  @ApiPropertyOptional({
    description: 'Personal or leadership motto in Bengali',
    example: 'মানবতার সেবাই পরম ধর্ম।',
  })
  @IsOptional()
  @IsString()
  mottoBn?: string;

  @ApiProperty({
    description: 'Joining year with the organization',
    example: '2018',
  })
  @IsNotEmpty({ message: 'Joining year is required' })
  @IsString()
  joiningYear: string;

  @ApiPropertyOptional({
    description: 'Whether the member is a key leader',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isKeyLeader?: boolean;

  @ApiPropertyOptional({
    description: 'Member category type',
    enum: MemberType,
    example: MemberType.COMMITTEE,
    default: MemberType.COMMITTEE,
  })
  @IsOptional()
  @IsEnum(MemberType, { message: 'Type must be either PIONEER or COMMITTEE' })
  type?: MemberType;

  @ApiPropertyOptional({
    description: 'Display order priority (ascending)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order?: number;
}
