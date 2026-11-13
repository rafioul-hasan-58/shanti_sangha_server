import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadProfileImageDto {
  @ApiPropertyOptional({
    description:
      'Optional Cloudinary public ID of the previous image to delete after a successful upload',
    example: 'members/old_image_id',
  })
  @IsOptional()
  @IsString({ message: 'oldPublicId must be a string' })
  oldPublicId?: string;
}
