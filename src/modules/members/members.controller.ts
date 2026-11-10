import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, QueryMemberDto, UpdateMemberDto } from './dto';

@ApiTags('Members')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new member' })
  @ApiResponse({
    status: 201,
    description: 'Member created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Member slug already in use.' })
  async create(@Body() dto: CreateMemberDto) {
    const data = await this.membersService.create(dto);
    return {
      message: 'Member created successfully',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all members with optional filters, pagination, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Members list retrieved successfully.',
  })
  async findAll(@Query() query: QueryMemberDto) {
    const data = await this.membersService.findAll(query);
    return {
      message: 'Members retrieved successfully',
      data,
    };
  }

  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single member by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Member details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async findOne(@Param('identifier') identifier: string) {
    const data = await this.membersService.findOne(identifier);
    return {
      message: 'Member retrieved successfully',
      data,
    };
  }

  @Patch(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing member by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  @ApiResponse({
    status: 409,
    description: 'New slug conflicts with an existing member.',
  })
  async update(
    @Param('identifier') identifier: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const data = await this.membersService.update(identifier, dto);
    return {
      message: 'Member updated successfully',
      data,
    };
  }

  @Delete(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a member by MongoDB ObjectId or unique slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Member deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async remove(@Param('identifier') identifier: string) {
    const data = await this.membersService.delete(identifier);
    return {
      message: 'Member deleted successfully',
      data,
    };
  }
}
