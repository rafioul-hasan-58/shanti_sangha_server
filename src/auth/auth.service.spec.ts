import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository } from '../modules/users/users.repository';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
  };

  const mockUser = {
    id: '64a1b2c3d4e5f67890123456',
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    fatherName: null,
    motherName: null,
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
    profileImage: null,
    authProvider: AuthProvider.EMAIL,
    emailVerified: null,
    phoneVerified: null,
    adminVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest
        .fn()
        .mockImplementation((id, data) =>
          Promise.resolve({ ...mockUser, ...data }),
        ),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);

      const result = await service.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(usersRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.fullName).toBe('Test User');
      expect('password' in result.user).toBe(false);
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@example.com');
      expect('password' in result.user).toBe(false);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('googleLogin', () => {
    it('should successfully login existing user via Google', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.googleLogin({
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should create new user via Google if not existing', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      const googleUser = {
        ...mockUser,
        authProvider: AuthProvider.GOOGLE,
      };
      usersRepository.create.mockResolvedValue(googleUser);

      const result = await service.googleLogin({
        email: 'newgoogle@example.com',
        fullName: 'Google User',
        profileImage: 'https://example.com/avatar.jpg',
      });

      expect(usersRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token');
    });
  });
});
