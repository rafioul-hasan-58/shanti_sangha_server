import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadService } from './upload.service';
import { DeleteProfileImageDto, UploadProfileImageDto } from './dto';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import { MAX_PROFILE_IMAGE_SIZE } from './upload.validator';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(UploadRateLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_PROFILE_IMAGE_SIZE,
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload member profile image (Admin only)',
    description:
      'Uploads a member profile image to Cloudinary (max 2 MB; JPEG, PNG, or WebP). Optionally deletes oldPublicId if provided.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP up to 2MB)',
        },
        oldPublicId: {
          type: 'string',
          nullable: true,
          description:
            'Optional Cloudinary public ID of the previous image to delete upon successful upload',
          example: 'members/c7b2x89a',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully to Cloudinary.',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Profile image uploaded successfully',
        data: {
          url: 'https://res.cloudinary.com/ti6mrbob/image/upload/v1234567890/members/c7b2x89a.webp',
          publicId: 'members/c7b2x89a',
          width: 800,
          height: 800,
          bytes: 145200,
          format: 'webp',
        },
        timestamp: '2026-11-13T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing file or invalid image format (magic bytes check).',
  })
  @ApiResponse({
    status: 413,
    description: 'Payload Too Large: file exceeds 2 MB limit.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (rate limit exceeded).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role).' })
  async uploadProfile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProfileImageDto,
  ) {
    const data = await this.uploadService.uploadProfileImage(
      file,
      dto.oldPublicId,
    );
    return {
      message: 'Profile image uploaded successfully',
      data,
    };
  }

  @Delete('profile')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete member profile image from Cloudinary (Admin only)',
    description:
      'Permanently deletes a profile image from Cloudinary. Only images inside the configured folder can be deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully from Cloudinary.',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Profile image deleted successfully',
        data: {
          deleted: true,
        },
        timestamp: '2026-11-13T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid publicId or publicId outside configured folder.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires Admin role).' })
  async deleteProfile(@Body() dto: DeleteProfileImageDto) {
    const data = await this.uploadService.deleteProfileImage(dto.publicId);
    return {
      message: 'Profile image deleted successfully',
      data,
    };
  }
}
