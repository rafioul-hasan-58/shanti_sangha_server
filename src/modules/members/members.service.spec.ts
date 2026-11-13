import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Member, MemberType } from '@prisma/client';
import { MembersService } from './members.service';
import { MembersRepository } from './members.repository';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

describe('MembersService', () => {
  let service: MembersService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
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
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: MembersRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a member with explicit slug', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockMember);

      const result = await service.create({
        slug: 'emon',
        nameEn: 'Md. Emon Hasan',
        nameBn: 'মোঃ ইমন হাসান',
        roleEn: 'President',
        roleBn: 'সভাপতি',
        villageEn: 'Shavarchala',
        villageBn: 'শাভারচালা',
        summaryEn: 'Community leader',
        summaryBn: 'সমাজকর্মী',
        joiningYear: '2018',
      });

      expect(repository.findBySlug).toHaveBeenCalledWith('emon');
      expect(repository.create).toHaveBeenCalled();
      expect(result.slug).toBe('emon');
    });

    it('should auto-generate slug from nameEn when slug is omitted', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockMember,
        slug: 'md-emon-hasan',
      });

      const result = await service.create({
        nameEn: 'Md. Emon Hasan',
        nameBn: 'মোঃ ইমন হাসান',
        roleEn: 'President',
        roleBn: 'সভাপতি',
        villageEn: 'Shavarchala',
        villageBn: 'শাভারচালা',
        summaryEn: 'Community leader',
        summaryBn: 'সমাজকর্মী',
        joiningYear: '2018',
      });

      expect(repository.findBySlug).toHaveBeenCalledWith('md-emon-hasan');
      expect(result.slug).toBe('md-emon-hasan');
    });

    it('should throw ConflictException if slug already exists', async () => {
      repository.findBySlug.mockResolvedValue(mockMember);

      await expect(
        service.create({
          slug: 'emon',
          nameEn: 'Md. Emon Hasan',
          nameBn: 'মোঃ ইমন হাসান',
          roleEn: 'President',
          roleBn: 'সভাপতি',
          villageEn: 'Shavarchala',
          villageBn: 'শাভারচালা',
          summaryEn: 'Community leader',
          summaryBn: 'সমাজকর্মী',
          joiningYear: '2018',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated members and metadata', async () => {
      repository.findAll.mockResolvedValue([mockMember]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.members).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by type and search keyword', async () => {
      repository.findAll.mockResolvedValue([mockMember]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll({
        type: MemberType.COMMITTEE,
        search: 'Emon',
        isKeyLeader: true,
      });

      expect(repository.findAll).toHaveBeenCalled();
      expect(repository.count).toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should find a member by valid 24-hex ObjectId', async () => {
      repository.findById.mockResolvedValue(mockMember);

      const result = await service.findOne('64a1b2c3d4e5f67890123456');
      expect(repository.findById).toHaveBeenCalledWith(
        '64a1b2c3d4e5f67890123456',
      );
      expect(result.id).toBe(mockMember.id);
    });

    it('should find a member by slug if not an ObjectId', async () => {
      repository.findBySlug.mockResolvedValue(mockMember);

      const result = await service.findOne('emon');
      expect(repository.findBySlug).toHaveBeenCalledWith('emon');
      expect(result.slug).toBe('emon');
    });

    it('should throw NotFoundException if member not found', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update member data successfully', async () => {
      repository.findBySlug.mockResolvedValue(mockMember);
      const updated = { ...mockMember, roleEn: 'Vice President' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update('emon', {
        roleEn: 'Vice President',
      });

      expect(result.roleEn).toBe('Vice President');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if updated slug is taken by another member', async () => {
      repository.findBySlug.mockImplementation((slug: string) => {
        if (slug === 'emon') return Promise.resolve(mockMember);
        if (slug === 'new-slug')
          return Promise.resolve({
            ...mockMember,
            id: 'another_id_123456789012',
            slug: 'new-slug',
          });
        return Promise.resolve(null);
      });

      await expect(
        service.update('emon', { slug: 'new-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete member successfully', async () => {
      repository.findBySlug.mockResolvedValue(mockMember);
      repository.delete.mockResolvedValue(mockMember);

      const result = await service.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(mockMember.id);
      expect(result.id).toBe(mockMember.id);
    });

    it('should delete member and call cloudinary deleteImage if imagePublicId exists', async () => {
      const memberWithImage = {
        ...mockMember,
        imagePublicId: 'members/emon_123',
      };
      repository.findBySlug.mockResolvedValue(memberWithImage);
      repository.delete.mockResolvedValue(memberWithImage);
      const mockCloudinary = {
        deleteImage: jest.fn().mockResolvedValue({ deleted: true }),
      };

      const serviceWithCloudinary = new MembersService(
        repository as unknown as MembersRepository,
        mockCloudinary as unknown as CloudinaryService,
      );

      const result = await serviceWithCloudinary.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(memberWithImage.id);
      expect(mockCloudinary.deleteImage).toHaveBeenCalledWith(
        'members/emon_123',
      );
      expect(result.id).toBe(memberWithImage.id);
    });

    it('should not fail member delete if cloudinary deleteImage throws', async () => {
      const memberWithImage = {
        ...mockMember,
        imagePublicId: 'members/emon_123',
      };
      repository.findBySlug.mockResolvedValue(memberWithImage);
      repository.delete.mockResolvedValue(memberWithImage);
      const mockCloudinary = {
        deleteImage: jest.fn().mockRejectedValue(new Error('Cloudinary down')),
      };

      const serviceWithCloudinary = new MembersService(
        repository as unknown as MembersRepository,
        mockCloudinary as unknown as CloudinaryService,
      );

      const result = await serviceWithCloudinary.delete('emon');
      expect(repository.delete).toHaveBeenCalledWith(memberWithImage.id);
      expect(result.id).toBe(memberWithImage.id);
    });

    it('should throw NotFoundException when deleting non-existent member', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.delete('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
