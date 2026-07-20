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
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.user.findMany({
      select: userSelect,
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
