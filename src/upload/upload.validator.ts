import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export type AllowedImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Validates real magic bytes from the start of the file buffer.
 * Does not trust the client-supplied mimetype header.
 */
export function detectImageMagicBytes(
  buffer: Buffer,
): AllowedImageFormat | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF [4 bytes size] WEBP
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  return null;
}

/**
 * Validates a profile image file for presence, maximum size (2MB), and real image signature.
 */
export function validateProfileImageFile(
  file?: Express.Multer.File,
): AllowedImageFormat {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('Profile image file is required');
  }

  if (
    file.size > MAX_PROFILE_IMAGE_SIZE ||
    file.buffer.length > MAX_PROFILE_IMAGE_SIZE
  ) {
    throw new PayloadTooLargeException(
      'File size exceeds 2 MB limit. Please upload a smaller image',
    );
  }

  const detectedFormat = detectImageMagicBytes(file.buffer);
  if (!detectedFormat) {
    throw new BadRequestException(
      'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
    );
  }

  return detectedFormat;
}
