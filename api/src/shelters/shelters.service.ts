import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
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
  isVerified: true,
  donationIban: true,
  paypalDonationUrl: true,
  donationUrl: true,
  donationUrlLabel: true,
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
    return this.createShelter(createShelterDto);
  }

  private async createShelter(createShelterDto: CreateShelterDto) {
    await this.assertShelterOwner(createShelterDto.ownerId);

    return this.prismaService.shelter.create({
      data: {
        name: createShelterDto.name,
        description: createShelterDto.description ?? null,
        city: createShelterDto.city ?? null,
        contactEmail: createShelterDto.contactEmail ?? null,
        websiteUrl: createShelterDto.websiteUrl ?? null,
        isVerified: createShelterDto.isVerified ?? false,
        ownerId: createShelterDto.ownerId ?? null,
      },
      select: shelterSelect,
    });
  }

  async update(id: string, updateShelterDto: UpdateShelterDto) {
    await this.assertShelterExists(id);
    await this.assertShelterOwner(updateShelterDto.ownerId);

    return this.prismaService.shelter.update({
      where: { id },
      data: {
        name: updateShelterDto.name,
        description: updateShelterDto.description,
        city: updateShelterDto.city,
        contactEmail: updateShelterDto.contactEmail,
        websiteUrl: updateShelterDto.websiteUrl,
        isVerified: updateShelterDto.isVerified,
        ownerId: updateShelterDto.ownerId,
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

  async setVerification(id: string, isVerified: boolean) {
    await this.assertShelterExists(id);

    return this.prismaService.shelter.update({
      where: { id },
      data: { isVerified: isVerified === true },
      select: shelterSelect,
    });
  }

  async getDonationSettings(ownerId: string) {
    const shelter = await this.prismaService.shelter.findUnique({
      where: { ownerId },
      select: {
        id: true,
        donationIban: true,
        paypalDonationUrl: true,
        donationUrl: true,
        donationUrlLabel: true,
      },
    });

    if (!shelter) {
      throw new NotFoundException(
        'No shelter profile is linked to this shelter account.',
      );
    }

    return shelter;
  }

  async updateDonationSettings(
    ownerId: string,
    settings: {
      donationIban?: string | null;
      paypalDonationUrl?: string | null;
      donationUrl?: string | null;
      donationUrlLabel?: string | null;
    },
  ) {
    await this.assertShelterOwner(ownerId);
    this.validateDonationSettings(settings);

    const shelter = await this.prismaService.shelter.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (!shelter) {
      throw new NotFoundException(
        'No shelter profile is linked to this shelter account.',
      );
    }

    return this.prismaService.shelter.update({
      where: { id: shelter.id },
      data: {
        donationIban: this.normalizeIban(settings.donationIban),
        paypalDonationUrl: this.normalizeUrl(settings.paypalDonationUrl),
        donationUrl: this.normalizeUrl(settings.donationUrl),
        donationUrlLabel: settings.donationUrlLabel?.trim() || null,
      },
      select: {
        id: true,
        donationIban: true,
        paypalDonationUrl: true,
        donationUrl: true,
        donationUrlLabel: true,
      },
    });
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

  private async assertShelterOwner(ownerId?: string | null) {
    if (ownerId === undefined || ownerId === null) {
      return;
    }

    const owner = await this.prismaService.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });

    if (!owner || owner.role !== UserRole.SHELTER) {
      throw new BadRequestException(
        'A shelter owner must be an existing SHELTER account.',
      );
    }
  }

  private validateDonationSettings(settings: {
    donationIban?: string | null;
    paypalDonationUrl?: string | null;
    donationUrl?: string | null;
    donationUrlLabel?: string | null;
  }) {
    const iban = this.normalizeIban(settings.donationIban);
    if (iban && !/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban)) {
      throw new BadRequestException('Enter a valid IBAN.');
    }

    const paypalUrl = this.normalizeUrl(settings.paypalDonationUrl);
    if (paypalUrl && !this.isPayPalUrl(paypalUrl)) {
      throw new BadRequestException('Enter a valid PayPal donation URL.');
    }

    if (settings.donationUrl && !this.normalizeUrl(settings.donationUrl)) {
      throw new BadRequestException('Enter a valid HTTPS donation URL.');
    }

    const label = settings.donationUrlLabel?.trim();
    if (label && label.length > 80) {
      throw new BadRequestException(
        'The donation link label must be 80 characters or less.',
      );
    }
  }

  private normalizeIban(iban?: string | null) {
    return iban?.replace(/\s/g, '').toUpperCase() || null;
  }

  private normalizeUrl(value?: string | null) {
    const url = value?.trim();
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  private isPayPalUrl(value: string) {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'paypal.com' ||
      hostname.endsWith('.paypal.com') ||
      hostname === 'paypal.me' ||
      hostname.endsWith('.paypal.me')
    );
  }
}
