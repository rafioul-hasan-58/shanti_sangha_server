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
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
    verifyAsync: jest.Mock;
    decode: jest.Mock;
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
      findById: jest.fn(),
      create: jest.fn(),
      update: jest
        .fn()
        .mockImplementation((id, data) =>
          Promise.resolve({ ...mockUser, ...data }),
        ),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token'),
      verifyAsync: jest.fn().mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
      }),
      decode: jest.fn().mockReturnValue(null),
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
    it('should successfully register a new user and return accessToken and refreshToken', async () => {
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
      expect(result.refreshToken).toBe('mock_jwt_token');
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
    it('should successfully login with valid credentials and return accessToken and refreshToken', async () => {
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
      expect(result.refreshToken).toBe('mock_jwt_token');
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
    it('should successfully login existing user via Google and return tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      const googlePayload = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
        JSON.stringify(googlePayload),
      ).toString('base64url')}.mockSignature`;

      const result = await service.googleLogin({
        token: mockJwt,
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should create new user via Google token if not existing', async () => {
      const googlePayload = {
        email: 'newgoogle@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
      };
      const mockJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
        JSON.stringify(googlePayload),
      ).toString('base64url')}.mockSignature`;

      usersRepository.findByEmail.mockResolvedValue(null);
      const googleUser = {
        ...mockUser,
        email: googlePayload.email,
        fullName: googlePayload.name,
        authProvider: AuthProvider.GOOGLE,
      };
      usersRepository.create.mockResolvedValue(googleUser);

      const result = await service.googleLogin({
        token: mockJwt,
      });

      expect(usersRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
    });

    it('should decode a Google JWT token and login or create user', async () => {
      const googlePayload = {
        email: 'decoded@gmail.com',
        name: 'Decoded Google User',
        picture: 'https://example.com/pic.jpg',
      };
      const mockJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
        JSON.stringify(googlePayload),
      ).toString('base64url')}.mockSignature`;

      jwtService.decode = jest.fn().mockReturnValue(googlePayload);
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue({
        ...mockUser,
        email: googlePayload.email,
        fullName: googlePayload.name,
      });

      const result = await service.googleLogin({
        token: mockJwt,
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(usersRepository.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens when given a valid refresh token', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid_refresh_token');

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
