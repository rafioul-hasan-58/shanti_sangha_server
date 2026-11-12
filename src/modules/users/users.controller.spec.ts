import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BloodGroup, MembershipType, Role, UserStatus } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { JwtPayload } from '../../common/guards/auth.guard';
import { UpdateProfileDto } from './dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
  };

  const mockJwtUser: JwtPayload = {
    id: '64a1b2c3d4e5f67890123456',
    email: 'test@example.com',
    role: Role.USER,
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
});
