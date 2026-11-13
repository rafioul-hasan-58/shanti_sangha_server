import { Readable } from 'stream';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  detectImageMagicBytes,
  validateProfileImageFile,
} from './upload.validator';

describe('UploadValidator', () => {
  const createJpegBuffer = () =>
    Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

  const createPngBuffer = () =>
    Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);

  const createWebpBuffer = () => {
    const buf = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(100, 4);
    buf.write('WEBP', 8, 'ascii');
    return buf;
  };

  describe('detectImageMagicBytes', () => {
    it('should detect valid JPEG magic bytes', () => {
      expect(detectImageMagicBytes(createJpegBuffer())).toBe('jpeg');
    });

    it('should detect valid PNG magic bytes', () => {
      expect(detectImageMagicBytes(createPngBuffer())).toBe('png');
    });

    it('should detect valid WebP magic bytes', () => {
      expect(detectImageMagicBytes(createWebpBuffer())).toBe('webp');
    });

    it('should return null for non-allowed file types or fake extensions', () => {
      // PDF file magic bytes
      const pdf = Buffer.from('%PDF-1.4 header text');
      expect(detectImageMagicBytes(pdf)).toBeNull();

      // GIF file magic bytes
      const gif = Buffer.from('GIF89a..........');
      expect(detectImageMagicBytes(gif)).toBeNull();

      // Text file
      const text = Buffer.from('Hello world this is a test');
      expect(detectImageMagicBytes(text)).toBeNull();

      // Short buffer
      expect(detectImageMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
    });
  });

  describe('validateProfileImageFile', () => {
    const createMockFile = (
      buffer: Buffer,
      size = buffer.length,
      mimetype = 'image/jpeg',
    ): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'avatar.jpg',
      encoding: '7bit',
      mimetype,
      size,
      buffer,
      destination: '',
      filename: '',
      path: '',
      stream: new Readable(),
    });

    it('should pass for a valid JPEG file', () => {
      const file = createMockFile(createJpegBuffer());
      expect(validateProfileImageFile(file)).toBe('jpeg');
    });

    it('should pass for a valid PNG file', () => {
      const file = createMockFile(createPngBuffer(), 12, 'image/png');
      expect(validateProfileImageFile(file)).toBe('png');
    });

    it('should pass for a valid WebP file', () => {
      const file = createMockFile(createWebpBuffer(), 16, 'image/webp');
      expect(validateProfileImageFile(file)).toBe('webp');
    });

    it('should throw BadRequestException if file is missing', () => {
      expect(() => validateProfileImageFile(undefined)).toThrow(
        BadRequestException,
      );
    });

    it('should throw PayloadTooLargeException if file exceeds 2 MB', () => {
      const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);
      const file = createMockFile(largeBuffer, largeBuffer.length);

      expect(() => validateProfileImageFile(file)).toThrow(
        PayloadTooLargeException,
      );
    });

    it('should throw BadRequestException if client sends fake mimetype but real content is invalid', () => {
      const fakeFile = createMockFile(
        Buffer.from('Not really a JPEG file at all'),
        28,
        'image/jpeg',
      );

      expect(() => validateProfileImageFile(fakeFile)).toThrow(
        BadRequestException,
      );
    });
  });
});
