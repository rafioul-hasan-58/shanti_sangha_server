import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { QueryUserDto, UpdateProfileDto, UpdateUserDto } from './dto';
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
   * Check if a string is a 24-character hexadecimal MongoDB ObjectId.
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Fetch user by ID and throw if ID is invalid or user does not exist.
   */
  private async findUserByIdOrThrow(userId: string): Promise<User> {
    const cleanId = userId.trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.usersRepository.findById(cleanId);
    if (!user) {
      throw new NotFoundException(`User with ID '${cleanId}' was not found`);
    }

    return user;
  }

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
   * Map shared profile fields from DTO into a Prisma update payload.
   */
  private buildProfileUpdateData(
    dto: UpdateProfileDto,
  ): Prisma.UserUpdateInput {
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

    return updateData;
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
    const updateData = this.buildProfileUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return sanitizeUser(existing);
    }

    const updated = await this.usersRepository.update(userId, updateData);
    return sanitizeUser(updated);
  }

  /**
   * Get all users with optional filters, pagination, and sorting (Admin).
   */
  async findAll(query: QueryUserDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.membershipType) {
      where.membershipType = query.membershipType;
    }
    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }
    if (typeof query.emailVerified === 'boolean') {
      where.emailVerified = query.emailVerified;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { phoneNumber: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { village: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { profession: { contains: term, mode: Prisma.QueryMode.insensitive } },
        {
          currentLocation: {
            contains: term,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ where, orderBy, skip, take }),
      this.usersRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users: users.map(sanitizeUser),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single user by MongoDB ObjectId (Admin).
   */
  async findOne(userId: string) {
    const user = await this.findUserByIdOrThrow(userId);
    return sanitizeUser(user);
  }

  /**
   * Update a user by MongoDB ObjectId (Admin).
   */
  async updateUser(userId: string, dto: UpdateUserDto, actorId?: string) {
    const existing = await this.findUserByIdOrThrow(userId);
    const updateData = this.buildProfileUpdateData(dto);

    if (dto.role !== undefined) {
      if (actorId && existing.id === actorId && dto.role !== existing.role) {
        throw new BadRequestException('You cannot change your own role');
      }
      updateData.role = dto.role;
    }

    if (dto.status !== undefined) {
      if (
        actorId &&
        existing.id === actorId &&
        dto.status === UserStatus.SUSPENDED
      ) {
        throw new BadRequestException('You cannot suspend your own account');
      }
      updateData.status = dto.status;
    }

    if (dto.emailVerified !== undefined) {
      updateData.emailVerified = dto.emailVerified;
    }

    if (dto.adminVerified !== undefined) {
      updateData.adminVerified = dto.adminVerified
        ? existing.adminVerified || new Date()
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      return sanitizeUser(existing);
    }

    const updated = await this.usersRepository.update(existing.id, updateData);
    return sanitizeUser(updated);
  }

  /**
   * Toggle a user's blocked status between SUSPENDED and ACTIVE (Admin).
   */
  async toggleBlockUser(userId: string, actorId?: string) {
    const existing = await this.findUserByIdOrThrow(userId);

    if (actorId && existing.id === actorId) {
      throw new BadRequestException(
        'You cannot block or unblock your own account',
      );
    }

    const nextStatus =
      existing.status === UserStatus.SUSPENDED
        ? UserStatus.ACTIVE
        : UserStatus.SUSPENDED;

    const updated = await this.usersRepository.update(existing.id, {
      status: nextStatus,
    });

    return sanitizeUser(updated);
  }

  /**
   * Permanently delete a user by MongoDB ObjectId (Admin).
   */
  async deleteUser(userId: string, actorId?: string) {
    const existing = await this.findUserByIdOrThrow(userId);

    if (actorId && existing.id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const deleted = await this.usersRepository.delete(existing.id);
    return sanitizeUser(deleted);
  }
}
