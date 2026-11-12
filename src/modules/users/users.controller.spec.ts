import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BloodGroup, MembershipType, Role, UserStatus } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { JwtPayload } from '../../common/guards/auth.guard';
import { QueryUserDto, UpdateProfileDto, UpdateUserDto } from './dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    toggleBlockUser: jest.Mock;
    updateUser: jest.Mock;
    deleteUser: jest.Mock;
  };

  const mockJwtUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123456',
    email: 'test@example.com',
    role: Role.USER,
  };

  const mockAdminUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123499',
    email: 'admin@example.com',
    role: Role.ADMIN,
  };

  const mockProfile = {
    id: mockJwtUser.id,
    fullName: 'Test User',
    email: mockJwtUser.email,
    role: Role.USER,
    status: UserStatus.ACTIVE,
    bloodGroup: BloodGroup.O_POSITIVE,
    membershipType: MembershipType.PERMANENT,
    village: 'Shavarchala',
  };

  beforeEach(async () => {
    usersService = {
      getProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest.fn().mockResolvedValue({
        ...mockProfile,
        fullName: 'Updated User',
      }),
      findAll: jest.fn().mockResolvedValue({
        users: [mockProfile],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockProfile),
      toggleBlockUser: jest.fn().mockResolvedValue({
        ...mockProfile,
        status: UserStatus.SUSPENDED,
      }),
      updateUser: jest.fn().mockResolvedValue({
        ...mockProfile,
        role: Role.MODERATOR,
      }),
      deleteUser: jest.fn().mockResolvedValue(mockProfile),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return authenticated user profile on GET /users/profile', async () => {
    const res = await controller.getMyProfile(mockJwtUser);
    expect(usersService.getProfile).toHaveBeenCalledWith(mockJwtUser.id);
    expect(res.message).toBe('Profile retrieved successfully');
    expect(res.data).toEqual(mockProfile);
  });

  it('should update authenticated user profile on PATCH /users/profile', async () => {
    const dto: UpdateProfileDto = { fullName: 'Updated User' };
    const res = await controller.updateMyProfile(mockJwtUser, dto);
    expect(usersService.updateProfile).toHaveBeenCalledWith(
      mockJwtUser.id,
      dto,
    );
    expect(res.message).toBe('Profile updated successfully');
    expect(res.data.fullName).toBe('Updated User');
  });

  it('should return paginated users on GET /users', async () => {
    const query: QueryUserDto = { page: 1, limit: 10 };
    const res = await controller.findAll(query);
    expect(usersService.findAll).toHaveBeenCalledWith(query);
    expect(res.message).toBe('Users retrieved successfully');
    expect(res.data.users).toHaveLength(1);
  });

  it('should return a single user on GET /users/:id', async () => {
    const res = await controller.findOne(mockJwtUser.id);
    expect(usersService.findOne).toHaveBeenCalledWith(mockJwtUser.id);
    expect(res.message).toBe('User retrieved successfully');
    expect(res.data).toEqual(mockProfile);
  });

  it('should toggle block status on PATCH /users/:id/toggle-block', async () => {
    const res = await controller.toggleBlock(mockJwtUser.id, mockAdminUser);
    expect(usersService.toggleBlockUser).toHaveBeenCalledWith(
      mockJwtUser.id,
      mockAdminUser.id,
    );
    expect(res.message).toBe('User blocked successfully');
    expect(res.data.status).toBe(UserStatus.SUSPENDED);
  });

  it('should update a user on PATCH /users/:id', async () => {
    const dto: UpdateUserDto = { role: Role.MODERATOR };
    const res = await controller.update(mockJwtUser.id, dto, mockAdminUser);
    expect(usersService.updateUser).toHaveBeenCalledWith(
      mockJwtUser.id,
      dto,
      mockAdminUser.id,
    );
    expect(res.message).toBe('User updated successfully');
    expect(res.data.role).toBe(Role.MODERATOR);
  });

  it('should delete a user on DELETE /users/:id', async () => {
    const res = await controller.remove(mockJwtUser.id, mockAdminUser);
    expect(usersService.deleteUser).toHaveBeenCalledWith(
      mockJwtUser.id,
      mockAdminUser.id,
    );
    expect(res.message).toBe('User deleted successfully');
    expect(res.data).toEqual(mockProfile);
  });
});
