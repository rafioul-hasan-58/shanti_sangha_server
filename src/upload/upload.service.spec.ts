import { Readable } from 'stream';
import { UploadService } from './upload.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('UploadService', () => {
  let service: UploadService;
  let cloudinaryService: {
    uploadImage: jest.Mock;
    deleteImage: jest.Mock;
    isWithinFolder: jest.Mock;
  };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'profile.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: validJpegBuffer.length,
    buffer: validJpegBuffer,
    destination: '',
    filename: '',
    path: '',
    stream: new Readable(),
  };

  const mockUploadResult = {
    url: 'https://res.cloudinary.com/test/image/upload/v1/members/img.jpg',
    publicId: 'members/img',
    width: 600,
    height: 600,
    bytes: 45000,
    format: 'jpg',
  };

  beforeEach(() => {
    cloudinaryService = {
      uploadImage: jest.fn().mockResolvedValue(mockUploadResult),
      deleteImage: jest.fn().mockResolvedValue({ deleted: true }),
      isWithinFolder: jest.fn().mockReturnValue(true),
    };

    service = new UploadService(
      cloudinaryService as unknown as CloudinaryService,
    );
  });

  describe('uploadProfileImage', () => {
    it('should validate and upload image to Cloudinary', async () => {
      const result = await service.uploadProfileImage(mockFile);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile.buffer,
      );
      expect(result).toEqual(mockUploadResult);
      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
    });

    it('should delete oldPublicId only after upload succeeds', async () => {
      const result = await service.uploadProfileImage(
        mockFile,
        'members/old_123',
      );

      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(cloudinaryService.isWithinFolder).toHaveBeenCalledWith(
        'members/old_123',
      );
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
        'members/old_123',
        true,
      );
      expect(result).toEqual(mockUploadResult);
    });

    it('should not fail the upload response if deleting oldPublicId throws', async () => {
      cloudinaryService.deleteImage.mockRejectedValue(
        new Error('Cloudinary timeout'),
      );

      const result = await service.uploadProfileImage(
        mockFile,
        'members/old_123',
      );

      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(result).toEqual(mockUploadResult);
    });
  });

  describe('deleteProfileImage', () => {
    it('should call cloudinaryService.deleteImage with enforceFolder=true', async () => {
      const result = await service.deleteProfileImage('members/img_123');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
        'members/img_123',
        true,
      );
      expect(result).toEqual({ deleted: true });
    });
  });
});
