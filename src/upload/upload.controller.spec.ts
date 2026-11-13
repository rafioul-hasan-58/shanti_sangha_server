import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let service: {
    uploadProfileImage: jest.Mock;
    deleteProfileImage: jest.Mock;
  };

  const mockFile = {
    fieldname: 'file',
    originalname: 'avatar.webp',
    buffer: Buffer.from('mock'),
    size: 4,
  } as Express.Multer.File;

  const mockUploadResult = {
    url: 'https://res.cloudinary.com/test/image/upload/v1/members/c7b2x89a.webp',
    publicId: 'members/c7b2x89a',
    width: 600,
    height: 600,
    bytes: 12000,
    format: 'webp',
  };

  beforeEach(async () => {
    service = {
      uploadProfileImage: jest.fn().mockResolvedValue(mockUploadResult),
      deleteProfileImage: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: service,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadProfile', () => {
    it('should upload profile image and return response envelope', async () => {
      const res = await controller.uploadProfile(mockFile, {
        oldPublicId: 'members/old_1',
      });

      expect(service.uploadProfileImage).toHaveBeenCalledWith(
        mockFile,
        'members/old_1',
      );
      expect(res).toEqual({
        message: 'Profile image uploaded successfully',
        data: mockUploadResult,
      });
    });
  });

  describe('deleteProfile', () => {
    it('should delete image and return response envelope', async () => {
      const res = await controller.deleteProfile({
        publicId: 'members/c7b2x89a',
      });

      expect(service.deleteProfileImage).toHaveBeenCalledWith(
        'members/c7b2x89a',
      );
      expect(res).toEqual({
        message: 'Profile image deleted successfully',
        data: { deleted: true },
      });
    });
  });
});
