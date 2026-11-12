import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository } from '../modules/users/users.repository';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
  let mailService: {
    sendPasswordResetOtp: jest.Mock;
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
    emailVerified: false,
    phoneVerified: false,
    adminVerified: false,
    googleId: null,
    resetOtpHash: null,
    resetOtpExpiresAt: null,
    resetOtpVerified: false,
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

    mailService = {
      sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: MailService,
          useValue: mailService,
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
      expect(result).toEqual({
        accessToken: 'mock_jwt_token',
        refreshToken: 'mock_jwt_token',
      });
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

      expect(result).toEqual({
        accessToken: 'mock_jwt_token',
        refreshToken: 'mock_jwt_token',
      });
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

      expect(result).toEqual({
        accessToken: 'mock_jwt_token',
        refreshToken: 'mock_jwt_token',
      });
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

  describe('forgotPassword', () => {
    it('should hash 6-digit OTP, store expiry, and send email', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({
        email: 'Test@example.com',
      });

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      const updateCalls = usersRepository.update.mock.calls as [
        string,
        {
          resetOtpHash?: string | null;
          resetOtpExpiresAt?: Date | null;
          resetOtpVerified?: boolean;
        },
      ][];
      expect(updateCalls[0][0]).toBe(mockUser.id);
      expect(typeof updateCalls[0][1].resetOtpHash).toBe('string');
      expect(updateCalls[0][1].resetOtpExpiresAt).toBeInstanceOf(Date);
      expect(updateCalls[0][1].resetOtpVerified).toBe(false);

      const mailCalls = mailService.sendPasswordResetOtp.mock.calls as [
        string,
        string,
        string,
        number,
      ][];
      expect(mailCalls[0][0]).toBe(mockUser.email);
      expect(mailCalls[0][1]).toBe(mockUser.fullName);
      expect(mailCalls[0][2]).toMatch(/^\d{6}$/);
      expect(mailCalls[0][3]).toBe(10);
      expect(result).toEqual({
        email: mockUser.email,
        expiresInMinutes: 10,
      });
    });

    it('should clear stored OTP fields if email sending fails', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      mailService.sendPasswordResetOtp.mockRejectedValue(
        new Error('SMTP down'),
      );

      await expect(
        service.forgotPassword({ email: 'test@example.com' }),
      ).rejects.toThrow('SMTP down');

      expect(usersRepository.update).toHaveBeenLastCalledWith(mockUser.id, {
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        resetOtpVerified: false,
      });
    });

    it('should throw NotFoundException when email is not registered', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'missing@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyOtp', () => {
    const validOtp = '482910';
    const validHash = crypto
      .createHash('sha256')
      .update(validOtp)
      .digest('hex');

    it('should verify valid OTP and mark resetOtpVerified true', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await service.verifyOtp({
        email: 'test@example.com',
        otp: validOtp,
      });

      const updateCalls = usersRepository.update.mock.calls as [
        string,
        {
          resetOtpExpiresAt?: Date | null;
          resetOtpVerified?: boolean;
        },
      ][];
      expect(updateCalls[0][0]).toBe(mockUser.id);
      expect(updateCalls[0][1].resetOtpVerified).toBe(true);
      expect(updateCalls[0][1].resetOtpExpiresAt).toBeInstanceOf(Date);
      expect(result).toEqual({ email: mockUser.email, verified: true });
    });

    it('should throw BadRequestException if OTP is incorrect', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.verifyOtp({ email: 'test@example.com', otp: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP has expired', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp({ email: 'test@example.com', otp: validOtp }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const validOtp = '482910';
    const validHash = crypto
      .createHash('sha256')
      .update(validOtp)
      .digest('hex');

    it('should reset password when OTP was previously verified', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resetOtpVerified: true,
      });

      const result = await service.resetPassword({
        email: 'test@example.com',
        newPassword: 'newPassword123',
      });

      const updateCalls = usersRepository.update.mock.calls as [
        string,
        {
          password?: string;
          resetOtpHash?: string | null;
          resetOtpExpiresAt?: Date | null;
          resetOtpVerified?: boolean;
        },
      ][];
      expect(updateCalls[0][0]).toBe(mockUser.id);
      expect(typeof updateCalls[0][1].password).toBe('string');
      expect(updateCalls[0][1].password).not.toBe('newPassword123');
      expect(updateCalls[0][1].resetOtpHash).toBeNull();
      expect(updateCalls[0][1].resetOtpExpiresAt).toBeNull();
      expect(updateCalls[0][1].resetOtpVerified).toBe(false);
      expect(result).toEqual({ email: mockUser.email });
    });

    it('should reset password when inline valid OTP is supplied', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resetOtpVerified: false,
      });

      const result = await service.resetPassword({
        email: 'test@example.com',
        otp: validOtp,
        newPassword: 'newPassword123',
      });

      expect(result).toEqual({ email: mockUser.email });
    });

    it('should throw BadRequestException if OTP has not been verified', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        resetOtpHash: validHash,
        resetOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resetOtpVerified: false,
      });

      await expect(
        service.resetPassword({
          email: 'test@example.com',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
