import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Member, MemberType, Prisma } from '@prisma/client';
import { MembersRepository } from './members.repository';
import { CreateMemberDto, QueryMemberDto, UpdateMemberDto } from './dto';

@Injectable()
export class MembersService {
  constructor(private readonly membersRepository: MembersRepository) {}

  /**
   * Helper to check if a string is a 24-character hexadecimal MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Helper to generate a URL-safe slug from English name
   */
  private generateBaseSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'member';
  }

  /**
   * Resolve a unique slug for a new member
   */
  private async resolveUniqueSlug(
    providedSlug?: string,
    nameEn?: string,
  ): Promise<string> {
    if (providedSlug?.trim()) {
      const normalized = providedSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const existing = await this.membersRepository.findBySlug(normalized);
      if (existing) {
        throw new ConflictException(
          `A member with slug '${normalized}' already exists`,
        );
      }
      return normalized;
    }

    const baseSlug = this.generateBaseSlug(nameEn || 'member');
    let candidate = baseSlug;
    let counter = 1;

    while (await this.membersRepository.findBySlug(candidate)) {
      candidate = `${baseSlug}-${counter}`;
      counter++;
    }

    return candidate;
  }

  /**
   * Create a new member
   */
  async create(dto: CreateMemberDto): Promise<Member> {
    const slug = await this.resolveUniqueSlug(dto.slug, dto.nameEn);

    return this.membersRepository.create({
      slug,
      nameEn: dto.nameEn.trim(),
      nameBn: dto.nameBn.trim(),
      roleEn: dto.roleEn.trim(),
      roleBn: dto.roleBn.trim(),
      villageEn: dto.villageEn.trim(),
      villageBn: dto.villageBn.trim(),
      summaryEn: dto.summaryEn.trim(),
      summaryBn: dto.summaryBn.trim(),
      image: dto.image?.trim() || null,
      joiningYear: dto.joiningYear.trim(),
      keyContributionEn: dto.keyContributionEn || [],
      keyContributionBn: dto.keyContributionBn || [],
      mottoEn: dto.mottoEn?.trim() || null,
      mottoBn: dto.mottoBn?.trim() || null,
      isKeyLeader: dto.isKeyLeader ?? false,
      type: dto.type || MemberType.COMMITTEE,
      order: dto.order ?? 0,
    });
  }

  /**
   * Get all members with filters and pagination
   */
  async findAll(query: QueryMemberDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.MemberWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (typeof query.isKeyLeader === 'boolean') {
      where.isKeyLeader = query.isKeyLeader;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { nameEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { nameBn: { contains: term } },
        { roleEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { roleBn: { contains: term } },
        { villageEn: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { villageBn: { contains: term } },
        { slug: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const sortBy = query.sortBy || 'order';
    const sortOrder = query.sortOrder || 'asc';
    const orderBy: Prisma.MemberOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== 'createdAt') {
      orderBy.push({ createdAt: 'desc' });
    }

    const [members, total] = await Promise.all([
      this.membersRepository.findAll({ where, orderBy, skip, take }),
      this.membersRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      members,
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
   * Get a single member by MongoDB ObjectId or Slug
   */
  async findOne(identifier: string): Promise<Member> {
    const cleanId = identifier.trim();
    let member: Member | null = null;

    if (this.isValidObjectId(cleanId)) {
      member = await this.membersRepository.findById(cleanId);
    }

    if (!member) {
      member = await this.membersRepository.findBySlug(cleanId);
    }

    if (!member) {
      throw new NotFoundException(
        `Member with identifier '${cleanId}' was not found`,
      );
    }

    return member;
  }

  /**
   * Update an existing member by ID or Slug
   */
  async update(identifier: string, dto: UpdateMemberDto): Promise<Member> {
    const existing = await this.findOne(identifier);

    let newSlug = existing.slug;
    if (dto.slug?.trim()) {
      const normalized = dto.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (normalized !== existing.slug) {
        const conflict = await this.membersRepository.findBySlug(normalized);
        if (conflict && conflict.id !== existing.id) {
          throw new ConflictException(
            `A member with slug '${normalized}' already exists`,
          );
        }
        newSlug = normalized;
      }
    }

    const updateData: Prisma.MemberUpdateInput = {
      ...(dto.nameEn !== undefined && { nameEn: dto.nameEn.trim() }),
      ...(dto.nameBn !== undefined && { nameBn: dto.nameBn.trim() }),
      ...(dto.roleEn !== undefined && { roleEn: dto.roleEn.trim() }),
      ...(dto.roleBn !== undefined && { roleBn: dto.roleBn.trim() }),
      ...(dto.villageEn !== undefined && { villageEn: dto.villageEn.trim() }),
      ...(dto.villageBn !== undefined && { villageBn: dto.villageBn.trim() }),
      ...(dto.summaryEn !== undefined && { summaryEn: dto.summaryEn.trim() }),
      ...(dto.summaryBn !== undefined && { summaryBn: dto.summaryBn.trim() }),
      ...(dto.joiningYear !== undefined && {
        joiningYear: dto.joiningYear.trim(),
      }),
      ...(dto.image !== undefined && {
        image: dto.image?.trim() || null,
      }),
      ...(dto.mottoEn !== undefined && {
        mottoEn: dto.mottoEn?.trim() || null,
      }),
      ...(dto.mottoBn !== undefined && {
        mottoBn: dto.mottoBn?.trim() || null,
      }),
      ...(dto.keyContributionEn !== undefined && {
        keyContributionEn: dto.keyContributionEn,
      }),
      ...(dto.keyContributionBn !== undefined && {
        keyContributionBn: dto.keyContributionBn,
      }),
      ...(dto.isKeyLeader !== undefined && { isKeyLeader: dto.isKeyLeader }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.order !== undefined && { order: dto.order }),
      slug: newSlug,
    };

    return this.membersRepository.update(existing.id, updateData);
  }

  /**
   * Delete a member by ID or Slug
   */
  async delete(identifier: string): Promise<Member> {
    const existing = await this.findOne(identifier);
    return this.membersRepository.delete(existing.id);
  }
}
