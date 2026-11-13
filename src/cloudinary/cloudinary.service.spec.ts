import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';
import { EnvConfig } from '../config/env.schema';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        const configMap: Record<string, string> = {
          CLOUDINARY_CLOUD_NAME: 'test_cloud',
          CLOUDINARY_API_KEY: 'test_key',
          CLOUDINARY_API_SECRET: 'test_secret',
          CLOUDINARY_FOLDER: 'members',
        };
        return configMap[key];
      }),
    };

    service = new CloudinaryService(
      configService as unknown as ConfigService<EnvConfig, true>,
    );
  });

  it('should initialize and configure cloudinary on startup', () => {
    expect(service).toBeDefined();
    expect(service.getFolder()).toBe('members');
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test_cloud',
      api_key: 'test_key',
      api_secret: 'test_secret',
      secure: true,
    });
  });

  it('should throw an error on startup if credentials are missing', () => {
    const invalidConfig = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(
      () =>
        new CloudinaryService(
          invalidConfig as unknown as ConfigService<EnvConfig, true>,
        ),
    ).toThrow('Cloudinary configuration is missing required credentials');
  });

  describe('isWithinFolder', () => {
    it('should return true for assets strictly inside the configured folder', () => {
      expect(service.isWithinFolder('members/abc123')).toBe(true);
      expect(service.isWithinFolder('members/sub/xyz')).toBe(true);
    });

    it('should return false for assets in other folders or root', () => {
      expect(service.isWithinFolder('gallery/photo')).toBe(false);
      expect(service.isWithinFolder('root_asset')).toBe(false);
      expect(service.isWithinFolder('')).toBe(false);
    });

    it('should reject path traversal attempts with ..', () => {
      expect(service.isWithinFolder('members/../secret')).toBe(false);
      expect(service.isWithinFolder('members/..\\secret')).toBe(false);
    });
  });

  describe('uploadImage', () => {
    it('should upload image buffer through upload_stream and return result', async () => {
      const mockResult = {
        secure_url:
          'https://res.cloudinary.com/test/image/upload/v1/members/img.webp',
        public_id: 'members/img',
        width: 800,
        height: 600,
        bytes: 12345,
        format: 'webp',
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (
          options: { folder?: string; transformation?: unknown[] },
          callback: (error: Error | null, result?: unknown) => void,
        ) => {
          expect(options.folder).toBe('members');
          expect(options.transformation).toEqual([
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ]);
          return {
            end: (buffer: Buffer) => {
              expect(buffer).toBeDefined();
              callback(null, mockResult);
            },
          };
        },
      );

      const buffer = Buffer.from('fake_image_bytes');
      const result = await service.uploadImage(buffer);

      expect(result).toEqual({
        url: mockResult.secure_url,
        publicId: mockResult.public_id,
        width: 800,
        height: 600,
        bytes: 12345,
        format: 'webp',
      });
    });

    it('should throw BadGatewayException without leaking secret when Cloudinary fails', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (
          _options: unknown,
          callback: (error: Error | null, result?: unknown) => void,
        ) => {
          return {
            end: () => {
              callback(new Error('Cloudinary server connection error'));
            },
          };
        },
      );

      await expect(service.uploadImage(Buffer.from('bytes'))).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete asset and return { deleted: true }', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
        result: 'ok',
      });

      const res = await service.deleteImage('members/img_123');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'members/img_123',
        { resource_type: 'image', invalidate: true },
      );
      expect(res).toEqual({ deleted: true });
    });

    it('should reject deletion if asset is not in the allowed folder', async () => {
      await expect(service.deleteImage('other_folder/asset')).rejects.toThrow(
        BadRequestException,
      );
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should throw BadGatewayException if destroy throws', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(service.deleteImage('members/img_123')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
