import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  deactivation: { select: { reason: true, deactivatedAt: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.prismaService.user.findMany({
      select: userSelect,
      where: normalizedSearch
        ? {
            OR: [
              { email: { contains: normalizedSearch, mode: 'insensitive' } },
              {
                firstName: { contains: normalizedSearch, mode: 'insensitive' },
              },
              { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prismaService.user.findUnique({
      select: userSelect,
      where: { id },
    });
  }

  create(createUserDto: CreateUserDto) {
    return this.prismaService.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: createUserDto.passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role ?? UserRole.USER,
        isActive: createUserDto.isActive ?? true,
      },
      select: userSelect,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.assertUserExists(id);

    return this.prismaService.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        passwordHash: updateUserDto.passwordHash,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
      select: userSelect,
    });
  }

  async remove(id: string) {
    await this.assertUserExists(id);

    await this.prismaService.user.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async setActiveStatus(id: string, isActive: boolean, reason?: string) {
    await this.assertUserExists(id);

    return this.prismaService.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isActive } });

      if (isActive) {
        await tx.userDeactivation.deleteMany({ where: { userId: id } });
      } else {
        await tx.userDeactivation.upsert({
          where: { userId: id },
          create: { userId: id, reason: reason?.trim() || null },
          update: { reason: reason?.trim() || null, deactivatedAt: new Date() },
        });
      }

      return tx.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    });
  }

  private async assertUserExists(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found`);
    }
  }
}
