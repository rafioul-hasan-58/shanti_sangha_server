import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  User,
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UsersRepository } from '../modules/users/users.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

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
    const membershipType =
      payload.MembershipType ||
      payload.membershipType ||
      MembershipType.PERMANENT;
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
      MembershipType: membershipType,
      facebookProfile: payload.facebookProfile || null,
      profileImage: payload.profileImage || null,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
    });

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };
    const accessToken = this.jwtService.sign(tokenPayload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
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

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };
    const accessToken = this.jwtService.sign(tokenPayload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Google OAuth / One Tap Login and Registration
   */
  async googleLogin(payload: GoogleLoginDto) {
    let email = payload.email;
    let fullName = payload.fullName;
    let profileImage = payload.profileImage;

    // 1. Verify with Google ID token if provided
    if (payload.idToken) {
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(payload.idToken)}`,
        );
        if (response.ok) {
          const googleData: any = await response.json();
          if (googleData.email) email = googleData.email;
          if (googleData.name) fullName = fullName || googleData.name;
          if (googleData.picture) profileImage = profileImage || googleData.picture;
        } else if (!email) {
          throw new UnauthorizedException('Invalid Google ID token');
        }
      } catch (error: any) {
        if (error instanceof UnauthorizedException) throw error;
        if (!email) {
          throw new UnauthorizedException('Failed to verify Google token');
        }
      }
    } else if (payload.accessToken) {
      // 2. Verify with Google Access Token if provided
      try {
        const response = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${payload.accessToken}`,
            },
          },
        );
        if (response.ok) {
          const googleData: any = await response.json();
          if (googleData.email) email = googleData.email;
          if (googleData.name) fullName = fullName || googleData.name;
          if (googleData.picture) profileImage = profileImage || googleData.picture;
        } else if (!email) {
          throw new UnauthorizedException('Invalid Google access token');
        }
      } catch (error: any) {
        if (error instanceof UnauthorizedException) throw error;
        if (!email) {
          throw new UnauthorizedException('Failed to verify Google user info');
        }
      }
    }

    if (!email) {
      throw new BadRequestException(
        'Google login requires a valid idToken, accessToken, or email address',
      );
    }

    email = email.toLowerCase().trim();

    // 3. Find or create user
    let user = await this.usersRepository.findByEmail(email);

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended!');
      }

      // Update missing profile info if available from Google
      const updateData: Record<string, any> = {};
      if (!user.profileImage && profileImage) {
        updateData.profileImage = profileImage;
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
      const resolvedFullName =
        fullName?.trim() || email.split('@')[0] || 'Google User';

      user = await this.usersRepository.create({
        fullName: resolvedFullName,
        email,
        password: hashedPassword,
        profileImage: profileImage || null,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: new Date(),
        role: Role.USER,
        status: UserStatus.ACTIVE,
        bloodGroup: BloodGroup.UNKNOWN,
        MembershipType: MembershipType.PERMANENT,
      });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };
    const accessToken = this.jwtService.sign(tokenPayload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Helper to exclude sensitive password field from user object
   */
  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
