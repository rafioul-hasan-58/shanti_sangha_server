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
    findAll: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
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
    emailVerified: false,
    phoneVerified: null,
    adminVerified: null,
    googleId: null,
    resetOtpHash: null,
    resetOtpExpiresAt: null,
    resetOtpVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      expect('resetOtpHash' in profile).toBe(false);
      expect('resetOtpExpiresAt' in profile).toBe(false);
      expect('resetOtpVerified' in profile).toBe(false);
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

  describe('findAll', () => {
    it('should return paginated sanitized users with metadata and apply filters', async () => {
      repository.findAll.mockResolvedValue([mockUser]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        search: 'Test',
        sortBy: 'fullName',
        sortOrder: 'asc',
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        where: {
          role: Role.USER,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          OR: [
            { fullName: { contains: 'Test', mode: 'insensitive' } },
            { email: { contains: 'Test', mode: 'insensitive' } },
            { phoneNumber: { contains: 'Test', mode: 'insensitive' } },
            { village: { contains: 'Test', mode: 'insensitive' } },
            { profession: { contains: 'Test', mode: 'insensitive' } },
            { currentLocation: { contains: 'Test', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
        skip: 5,
        take: 5,
      });
      expect(result.users).toHaveLength(1);
      expect('password' in result.users[0]).toBe(false);
      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return a sanitized user by ObjectId', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect('password' in result).toBe(false);
    });

    it('should throw BadRequestException for invalid ObjectId', async () => {
      await expect(service.findOne('not-an-object-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('64a1b2c3d4e5f67890123457')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should update admin and profile fields and return sanitized user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      const updatedUser: User = {
        ...mockUser,
        fullName: 'Updated Admin Target',
        role: Role.MODERATOR,
        status: UserStatus.INACTIVE,
        emailVerified: true,
        adminVerified: new Date(),
      };
      repository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(
        mockUser.id,
        {
          fullName: ' Updated Admin Target ',
          role: Role.MODERATOR,
          status: UserStatus.INACTIVE,
          emailVerified: true,
          adminVerified: true,
        },
        actorId,
      );

      const updateCalls = repository.update.mock.calls as [
        string,
        {
          fullName?: string;
          role?: Role;
          status?: UserStatus;
          emailVerified?: boolean;
          adminVerified?: Date | null;
        },
      ][];
      expect(updateCalls[0][0]).toBe(mockUser.id);
      expect(updateCalls[0][1]).toMatchObject({
        fullName: 'Updated Admin Target',
        role: Role.MODERATOR,
        status: UserStatus.INACTIVE,
        emailVerified: true,
      });
      expect(updateCalls[0][1].adminVerified).toBeInstanceOf(Date);
      expect(result.role).toBe(Role.MODERATOR);
      expect('password' in result).toBe(false);
    });

    it('should clear adminVerified when set to false', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        adminVerified: new Date(),
      });
      repository.update.mockResolvedValue({
        ...mockUser,
        adminVerified: null,
      });

      const result = await service.updateUser(
        mockUser.id,
        { adminVerified: false },
        actorId,
      );

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        adminVerified: null,
      });
      expect(result.adminVerified).toBeNull();
    });

    it('should prevent changing own role or suspending own account', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });

      await expect(
        service.updateUser(mockUser.id, { role: Role.USER }, mockUser.id),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateUser(
          mockUser.id,
          { status: UserStatus.SUSPENDED },
          mockUser.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleBlockUser', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should block an active user by setting status to SUSPENDED', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });
      repository.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const result = await service.toggleBlockUser(mockUser.id, actorId);

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        status: UserStatus.SUSPENDED,
      });
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect('password' in result).toBe(false);
    });

    it('should unblock a suspended user by setting status to ACTIVE', async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      repository.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      const result = await service.toggleBlockUser(mockUser.id, actorId);

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        status: UserStatus.ACTIVE,
      });
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw BadRequestException if admin tries to block themselves', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(
        service.toggleBlockUser(mockUser.id, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    const actorId = '64a1b2c3d4e5f67890123499';

    it('should delete user and return sanitized deleted record', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(mockUser);

      const result = await service.deleteUser(mockUser.id, actorId);

      expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect('password' in result).toBe(false);
    });

    it('should throw BadRequestException if admin tries to delete themselves', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(
        service.deleteUser(mockUser.id, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
