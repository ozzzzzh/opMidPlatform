import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SAFE_USER_SELECT } from '../common/prisma-selects';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_COST = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserWhereInput = {};

    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword, mode: 'insensitive' } },
        { displayName: { contains: query.keyword, mode: 'insensitive' } },
        { email: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async create(dto: CreateUserDto, actor: SafeUser) {
    const requestedRole = dto.role ?? Role.USER;

    if (actor.role === Role.OPS && requestedRole === Role.ADMIN) {
      throw new ForbiddenException('运维角色不能创建管理员账号');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username,
          displayName: dto.displayName,
          email: dto.email ?? null,
          passwordHash,
          role: requestedRole,
          active: dto.active ?? true,
        },
        select: SAFE_USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('用户名已存在');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: SafeUser) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!existing) {
      throw new NotFoundException('用户不存在');
    }

    if (actor.role === Role.OPS && existing.role === Role.ADMIN) {
      throw new ForbiddenException('运维角色不能修改管理员账号');
    }

    if (actor.role === Role.OPS && dto.role === Role.ADMIN) {
      throw new ForbiddenException('运维角色不能授予管理员权限');
    }

    if (actor.id === id) {
      if (dto.active === false) {
        throw new BadRequestException('不能停用当前登录账号');
      }
      if (dto.role && dto.role !== existing.role) {
        throw new BadRequestException('不能修改当前登录账号的角色');
      }
    }

    const losesAdmin =
      existing.role === Role.ADMIN &&
      existing.active &&
      (dto.active === false || (dto.role !== undefined && dto.role !== Role.ADMIN));

    if (losesAdmin) {
      await this.assertNotLastActiveAdmin();
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_USER_SELECT,
    });
  }

  /** DELETE 采用软停用，避免历史工单/审计记录失去关联用户。 */
  async deactivate(id: string, actor: SafeUser) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!existing) {
      throw new NotFoundException('用户不存在');
    }

    if (actor.id === id) {
      throw new BadRequestException('不能停用当前登录账号');
    }

    if (actor.role === Role.OPS && existing.role === Role.ADMIN) {
      throw new ForbiddenException('运维角色不能停用管理员账号');
    }

    if (existing.active && existing.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin();
    }

    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: SAFE_USER_SELECT,
    });
  }

  private async assertNotLastActiveAdmin(): Promise<void> {
    const activeAdminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN, active: true },
    });

    if (activeAdminCount <= 1) {
      throw new BadRequestException('系统至少需要保留一名启用状态的管理员');
    }
  }
}
