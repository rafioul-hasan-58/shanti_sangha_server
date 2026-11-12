import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthProvider,
  BloodGroup,
  MembershipType,
  Role,
  User,
  UserStatus,
} from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findById: jest.Mock;
    update: jest.Mock;
  };

  const mockUser: User = {
    id: '64a1b2c3d4e5f67890123456',
    fullName: 'Test User',
    fatherName: null,
    motherName: null,
    email: 'test@example.com',
    password: 'hashed_secret_password',
    profileImage: null,
    phoneNumber: null,
    bloodGroup: BloodGroup.UNKNOWN,
    bio: null,
    summary: null,
    status: UserStatus.ACTIVE,
    role: Role.USER,
    profession: null,
    village: null,
    currentLocation: null,
    whatsappNumber: null,
    membershipType: MembershipType.PERMANENT,
    facebookProfile: null,
    authProvider: AuthProvider.EMAIL,
    emailVerified: null,
    phoneVerified: null,
    adminVerified: null,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return sanitized user profile without password', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const profile = await service.getProfile(mockUser.id);

      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
      expect('password' in profile).toBe(false);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProfile('missing_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.getProfile(mockUser.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update allowed profile fields and return sanitized user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      const updatedUser: User = {
        ...mockUser,
        fullName: 'Updated Name',
        village: 'Shavarchala',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: null,
      };
      repository.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUser.id, {
        fullName: '  Updated Name  ',
        village: '  Shavarchala ',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: '   ',
      });

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        fullName: 'Updated Name',
        village: 'Shavarchala',
        bloodGroup: BloodGroup.O_POSITIVE,
        bio: null,
      });
      expect(result.fullName).toBe('Updated Name');
      expect(result.village).toBe('Shavarchala');
      expect('password' in result).toBe(false);
    });

    it('should skip repository update when payload has no fields', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.updateProfile(mockUser.id, {});

      expect(repository.update).not.toHaveBeenCalled();
      expect(result.id).toBe(mockUser.id);
      expect('password' in result).toBe(false);
    });

    it('should throw BadRequestException if trimmed fullName is shorter than 2 characters', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile(mockUser.id, { fullName: '  A ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing_id', { fullName: 'Someone' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.updateProfile(mockUser.id, { fullName: 'Someone' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
