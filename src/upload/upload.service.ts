import { Injectable, Logger } from '@nestjs/common';
import {
  CloudinaryService,
  CloudinaryUploadResult,
} from '../cloudinary/cloudinary.service';
import { validateProfileImageFile } from './upload.validator';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Upload a member profile photo.
   * If oldPublicId is provided, deletes the old asset from Cloudinary ONLY AFTER
   * the new image is uploaded successfully.
   */
  async uploadProfileImage(
    file?: Express.Multer.File,
    oldPublicId?: string,
  ): Promise<CloudinaryUploadResult> {
    validateProfileImageFile(file);

    // File and buffer are valid at this point
    const uploaded = await this.cloudinaryService.uploadImage(file!.buffer);

    // Cleanup old image if provided
    if (oldPublicId && oldPublicId.trim()) {
      const cleanOldId = oldPublicId.trim();
      try {
        if (this.cloudinaryService.isWithinFolder(cleanOldId)) {
          await this.cloudinaryService.deleteImage(cleanOldId, true);
        } else {
          this.logger.warn(
            `Skipping deletion of oldPublicId '${cleanOldId}': does not match allowed folder`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to cleanup old image '${cleanOldId}' after successful upload: ${message}`,
        );
      }
    }

    return uploaded;
  }

  /**
   * Delete an existing profile photo from Cloudinary.
   */
  async deleteProfileImage(publicId: string): Promise<{ deleted: boolean }> {
    return this.cloudinaryService.deleteImage(publicId, true);
  }
}
