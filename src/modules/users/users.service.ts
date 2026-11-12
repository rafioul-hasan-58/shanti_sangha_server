import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto';
import { sanitizeUser } from './users.utils';

const NULLABLE_PROFILE_STRING_FIELDS = [
  'fatherName',
  'motherName',
  'profileImage',
  'phoneNumber',
  'bio',
  'summary',
  'profession',
  'village',
  'currentLocation',
  'whatsappNumber',
  'facebookProfile',
] as const;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Fetch user by ID and verify the account exists and is not suspended.
   */
  private async findActiveUserOrThrow(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended!');
    }
    return user;
  }

  /**
   * Get the authenticated user's profile.
   */
  async getProfile(userId: string) {
    const user = await this.findActiveUserOrThrow(userId);
    return sanitizeUser(user);
  }

  /**
   * Update the authenticated user's profile fields.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.findActiveUserOrThrow(userId);

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) {
      const trimmedName = dto.fullName.trim();
      if (trimmedName.length < 2) {
        throw new BadRequestException(
          'Full name must be at least 2 characters',
        );
      }
      updateData.fullName = trimmedName;
    }

    for (const field of NULLABLE_PROFILE_STRING_FIELDS) {
      const value = dto[field];
      if (value !== undefined) {
        updateData[field] = value.trim() || null;
      }
    }

    if (dto.bloodGroup !== undefined) {
      updateData.bloodGroup = dto.bloodGroup;
    }

    if (dto.membershipType !== undefined) {
      updateData.membershipType = dto.membershipType;
    }

    if (Object.keys(updateData).length === 0) {
      return sanitizeUser(existing);
    }

    const updated = await this.usersRepository.update(userId, updateData);
    return sanitizeUser(updated);
  }
}
