import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { AuthGuard, type JwtPayload } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { QueryUserDto, UpdateProfileDto, UpdateUserDto } from './dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated user profile (My Profile)' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    const data = await this.usersService.getProfile(user.id);
    return {
      message: 'Profile retrieved successfully',
      data,
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.usersService.updateProfile(user.id, dto);
    return {
      message: 'Profile updated successfully',
      data,
    };
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all users with optional filters, pagination, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(@Query() query: QueryUserDto) {
    const data = await this.usersService.findAll(query);
    return {
      message: 'Users retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single user by MongoDB ObjectId' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findOne(id);
    return {
      message: 'User retrieved successfully',
      data,
    };
  }

  @Patch(':id/toggle-block')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle user block/unblock status (SUSPENDED <-> ACTIVE)',
  })
  @ApiResponse({
    status: 200,
    description: 'User block status toggled successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or self-action.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async toggleBlock(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.usersService.toggleBlockUser(id, user.id);
    return {
      message:
        data.status === UserStatus.SUSPENDED
          ? 'User blocked successfully'
          : 'User unblocked successfully',
      data,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user by MongoDB ObjectId (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.usersService.updateUser(id, dto, user.id);
    return {
      message: 'User updated successfully',
      data,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user by MongoDB ObjectId (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request or self-action.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.usersService.deleteUser(id, user.id);
    return {
      message: 'User deleted successfully',
      data,
    };
  }
}
