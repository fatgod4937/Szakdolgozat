import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

const shelterSelect = {
  id: true,
  name: true,
  description: true,
  city: true,
  contactEmail: true,
  websiteUrl: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShelterSelect;

@Injectable()
export class SheltersService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.shelter.findMany({
      select: shelterSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prismaService.shelter.findUnique({
      select: shelterSelect,
      where: { id },
    });
  }

  create(createShelterDto: CreateShelterDto) {
    return this.prismaService.shelter.create({
      data: {
        name: createShelterDto.name,
        description: createShelterDto.description ?? null,
        city: createShelterDto.city ?? null,
        contactEmail: createShelterDto.contactEmail ?? null,
        websiteUrl: createShelterDto.websiteUrl ?? null,
        verified: createShelterDto.verified ?? false,
      },
      select: shelterSelect,
    });
  }

  async update(id: string, updateShelterDto: UpdateShelterDto) {
    await this.assertShelterExists(id);

    return this.prismaService.shelter.update({
      where: { id },
      data: {
        name: updateShelterDto.name,
        description: updateShelterDto.description,
        city: updateShelterDto.city,
        contactEmail: updateShelterDto.contactEmail,
        websiteUrl: updateShelterDto.websiteUrl,
        verified: updateShelterDto.verified,
      },
      select: shelterSelect,
    });
  }

  async remove(id: string) {
    await this.assertShelterExists(id);

    await this.prismaService.shelter.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private async assertShelterExists(id: string) {
    const shelter = await this.prismaService.shelter.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!shelter) {
      throw new NotFoundException(`Shelter with id "${id}" was not found`);
    }
  }
}
