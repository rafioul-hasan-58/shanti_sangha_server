import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteProfileImageDto {
  @ApiProperty({
    description: 'Cloudinary public ID of the image to delete',
    example: 'members/c7b2x89a',
  })
  @IsNotEmpty({ message: 'publicId is required' })
  @IsString({ message: 'publicId must be a string' })
  publicId: string;
}
