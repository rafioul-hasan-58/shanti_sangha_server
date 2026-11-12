import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  User,
  Prisma,
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UsersRepository } from '../modules/users/users.repository';
import { sanitizeUser } from '../modules/users/users.utils';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { EnvConfig } from '../config/env.schema';

interface GoogleJwtPayload {
  iss?: string;
  sub?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
}

interface RefreshTokenPayload {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    @Optional()
    private readonly configService?: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Helper to generate both accessToken and refreshToken for a user
   */
  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };

    const accessSecret =
      this.configService?.get('JWT_ACCESS_SECRET', { infer: true }) ||
      process.env.JWT_ACCESS_SECRET ||
      'default_jwt_secret_key_12345';
    const accessExpiresIn =
      this.configService?.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) ||
      process.env.JWT_ACCESS_EXPIRES_IN ||
      '7d';

    const refreshSecret =
      this.configService?.get('JWT_REFRESH_SECRET', { infer: true }) ||
      process.env.JWT_REFRESH_SECRET ||
      `${accessSecret}_refresh`;
    const refreshExpiresIn =
      this.configService?.get('JWT_REFRESH_EXPIRES_IN', { infer: true }) ||
      process.env.JWT_REFRESH_EXPIRES_IN ||
      '30d';

    const accessSignOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiresIn as unknown as number,
    };

    const refreshSignOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as unknown as number,
    };

    const accessToken = this.jwtService.sign(tokenPayload, accessSignOptions);
    const refreshToken = this.jwtService.sign(
      { id: user.id, email: user.email },
      refreshSignOptions,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper to decode a Google JWT token (e.g. from Google One Tap / Sign-In)
   */
  private decodeGoogleToken(rawToken: string): GoogleJwtPayload | null {
    try {
      // 1. Base64url decode of JWT payload
      const parts = rawToken.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
        const parsed = JSON.parse(payloadStr) as Record<string, unknown>;
        if (parsed && typeof parsed.email === 'string') {
          return parsed;
        }
      }

      // 2. Fallback using jwtService.decode
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded: any = this.jwtService.decode(rawToken);

      if (
        decoded &&
        typeof decoded === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof decoded.email === 'string'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decoded;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user with email and password
   */
  async register(payload: RegisterDto) {
    const email = payload.email.toLowerCase().trim();
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      throw new ConflictException('This email is already in use!');
    }

    const fullName = (payload.fullName || '').trim();
    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const membershipType = payload.membershipType || MembershipType.PERMANENT;
    const bloodGroup = payload.bloodGroup || BloodGroup.UNKNOWN;

    const user = await this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      fatherName: payload.fatherName || null,
      motherName: payload.motherName || null,
      phoneNumber: payload.phoneNumber || null,
      bloodGroup,
      bio: payload.bio || null,
      summary: payload.summary || null,
      profession: payload.profession || null,
      village: payload.village || null,
      currentLocation: payload.currentLocation || null,
      whatsappNumber: payload.whatsappNumber || null,
      membershipType,
      facebookProfile: payload.facebookProfile || null,
      profileImage: payload.profileImage || null,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
    });

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
      // Backward compatibility fields
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };
  }

  /**
   * Login user with email and password
   */
  async login(payload: LoginDto) {
    const email = payload.email.toLowerCase().trim();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    const isMatch = await bcrypt.compare(payload.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended!');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  /**
   * Google JWT Token Login and Registration
   */
  async googleLogin(payload: GoogleLoginDto) {
    const rawJwt = payload.token?.trim();
    if (!rawJwt) {
      throw new BadRequestException('Google token is required');
    }

    const decoded = this.decodeGoogleToken(rawJwt);
    if (!decoded || !decoded.email) {
      throw new UnauthorizedException(
        'Invalid Google token: unable to decode user information',
      );
    }

    const email = decoded.email.toLowerCase().trim();
    const fullName =
      decoded.name?.trim() ||
      decoded.given_name?.trim() ||
      email.split('@')[0] ||
      'Google User';
    const profileImage = decoded.picture || null;
    const googleId = decoded.sub || null;

    // Find or create user
    let user = await this.usersRepository.findByEmail(email);

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended!');
      }

      // Update missing profile info if available from Google
      const updateData: Prisma.UserUpdateInput = {};
      if (!user.profileImage && profileImage) {
        updateData.profileImage = profileImage;
      }
      if (!user.googleId && googleId) {
        updateData.googleId = googleId;
      }
      if (!user.emailVerified) {
        updateData.emailVerified = new Date();
      }
      if (Object.keys(updateData).length > 0) {
        const updated = await this.usersRepository.update(user.id, updateData);
        user = updated || { ...user, ...updateData };
      }
    } else {
      // Create new user for first-time Google sign-in
      const randomPassword =
        crypto.randomUUID() + crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await this.usersRepository.create({
        fullName,
        email,
        password: hashedPassword,
        googleId,
        profileImage,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: new Date(),
        role: Role.USER,
        status: UserStatus.ACTIVE,
        bloodGroup: BloodGroup.UNKNOWN,
        membershipType: MembershipType.PERMANENT,
      });
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const accessSecret =
      this.configService?.get('JWT_ACCESS_SECRET', { infer: true }) ||
      process.env.JWT_ACCESS_SECRET ||
      'default_jwt_secret_key_12345';
    const refreshSecret =
      this.configService?.get('JWT_REFRESH_SECRET', { infer: true }) ||
      process.env.JWT_REFRESH_SECRET ||
      `${accessSecret}_refresh`;

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshTokenString,
        {
          secret: refreshSecret,
        },
      );

      const user = await this.usersRepository.findById(payload.id);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended!');
      }

      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
