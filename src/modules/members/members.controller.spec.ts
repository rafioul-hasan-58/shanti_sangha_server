import { Test, TestingModule } from '@nestjs/testing';
import { Member, MemberType } from '@prisma/client';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { CreateMemberDto, QueryMemberDto, UpdateMemberDto } from './dto';

describe('MembersController', () => {
  let controller: MembersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockMember: Member = {
    id: '64a1b2c3d4e5f67890123456',
    slug: 'emon',
    nameEn: 'Md. Emon Hasan',
    nameBn: 'মোঃ ইমন হাসান',
    roleEn: 'President',
    roleBn: 'সভাপতি',
    image: 'https://example.com/emon.jpg',
    imagePublicId: null,
    villageEn: 'Shavarchala',
    villageBn: 'শাভারচালা',
    summaryEn: 'Community leader',
    summaryBn: 'সমাজকর্মী',
    keyContributionEn: ['Sports club founder'],
    keyContributionBn: ['ক্রীড়া ক্লাব প্রতিষ্ঠাতা'],
    mottoEn: 'Unity is strength',
    mottoBn: 'একতাই বল',
    joiningYear: '2018',
    isKeyLeader: true,
    type: MemberType.COMMITTEE,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockMember),
      findAll: jest.fn().mockResolvedValue({
        members: [mockMember],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      findOne: jest.fn().mockResolvedValue(mockMember),
      update: jest.fn().mockResolvedValue(mockMember),
      delete: jest.fn().mockResolvedValue(mockMember),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<MembersController>(MembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a member via POST /members', async () => {
    const dto: CreateMemberDto = {
      nameEn: 'Md. Emon Hasan',
      nameBn: 'মোঃ ইমন হাসান',
      roleEn: 'President',
      roleBn: 'সভাপতি',
      villageEn: 'Shavarchala',
      villageBn: 'শাভারচালা',
      summaryEn: 'Community leader',
      summaryBn: 'সমাজকর্মী',
      joiningYear: '2018',
    };

    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.message).toBe('Member created successfully');
    expect(result.data).toBe(mockMember);
  });

  it('should get all members via GET /members', async () => {
    const query: QueryMemberDto = { page: 1, limit: 10 };
    const result = await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.message).toBe('Members retrieved successfully');
    expect(result.data.members).toHaveLength(1);
  });

  it('should get a single member via GET /members/:identifier', async () => {
    const result = await controller.findOne('emon');
    expect(service.findOne).toHaveBeenCalledWith('emon');
    expect(result.message).toBe('Member retrieved successfully');
    expect(result.data).toBe(mockMember);
  });

  it('should update a member via PATCH /members/:identifier', async () => {
    const dto: UpdateMemberDto = { roleEn: 'Senior President' };
    const result = await controller.update('emon', dto);
    expect(service.update).toHaveBeenCalledWith('emon', dto);
    expect(result.message).toBe('Member updated successfully');
    expect(result.data).toBe(mockMember);
  });

  it('should delete a member via DELETE /members/:identifier', async () => {
    const result = await controller.remove('emon');
    expect(service.delete).toHaveBeenCalledWith('emon');
    expect(result.message).toBe('Member deleted successfully');
    expect(result.data).toBe(mockMember);
  });
});
