import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { EnvConfig } from '../config/env.schema';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly defaultFolder: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME', {
      infer: true,
    });
    const apiKey = this.configService.get('CLOUDINARY_API_KEY', {
      infer: true,
    });
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET', {
      infer: true,
    });
    this.defaultFolder =
      this.configService.get('CLOUDINARY_FOLDER', { infer: true }) || 'members';

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary configuration is missing required credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  getFolder(): string {
    return this.defaultFolder;
  }

  /**
   * Validates whether a publicId belongs strictly to the allowed folder.
   * Prevents directory traversal attacks and deletion of assets in other folders.
   */
  isWithinFolder(publicId: string, folder = this.defaultFolder): boolean {
    if (!publicId || typeof publicId !== 'string') {
      return false;
    }
    const normalized = publicId.trim().replace(/\\/g, '/');
    if (normalized.includes('..')) {
      return false;
    }
    return (
      normalized.startsWith(`${folder}/`) &&
      normalized.length > `${folder}/`.length
    );
  }

  /**
   * Upload an image buffer to Cloudinary with max 1200px longest side (no upscale),
   * auto quality, and auto format.
   */
  async uploadImage(
    buffer: Buffer,
    options?: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult> {
    const folder = options?.folder || this.defaultFolder;
    const maxWidth = options?.maxWidth || 1200;
    const maxHeight = options?.maxHeight || 1200;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: maxWidth, height: maxHeight, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
            );
            return reject(
              new BadGatewayException('Failed to upload image to Cloudinary'),
            );
          }

          if (!result || !result.secure_url) {
            this.logger.error('Cloudinary upload returned empty response');
            return reject(
              new BadGatewayException(
                'Cloudinary upload returned empty response',
              ),
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary by publicId.
   * If enforceFolder is true (default), verifies the publicId is within the configured folder.
   */
  async deleteImage(
    publicId: string,
    enforceFolder = true,
  ): Promise<{ deleted: boolean }> {
    if (!publicId || typeof publicId !== 'string') {
      throw new BadRequestException('Image publicId is required');
    }

    const trimmedId = publicId.trim();

    if (enforceFolder && !this.isWithinFolder(trimmedId)) {
      throw new BadRequestException(
        `Invalid publicId: only assets within the '${this.defaultFolder}' folder can be deleted`,
      );
    }

    try {
      const result = (await cloudinary.uploader.destroy(trimmedId, {
        resource_type: 'image',
        invalidate: true,
      })) as { result?: string };

      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(
          `Cloudinary delete returned status '${result.result || 'unknown'}' for publicId: ${trimmedId}`,
        );
      }

      return { deleted: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cloudinary deletion failed for ${trimmedId}: ${msg}`);
      throw new BadGatewayException('Failed to delete image from Cloudinary');
    }
  }
}
