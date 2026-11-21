import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShelterApplicationStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
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
  applicationStatus: true,
  reviewNote: true,
  reviewedAt: true,
  documents: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      createdAt: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShelterSelect;

type UploadedShelterDocument = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

const MIN_DOCUMENTS = 1;
const MAX_DOCUMENTS = 5;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
]);

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

  async getMyApplication(ownerId: string) {
    const shelter = await this.prismaService.shelter.findUnique({
      where: { ownerId },
      select: shelterSelect,
    });

    if (!shelter) {
      throw new NotFoundException('No shelter application was found.');
    }

    return shelter;
  }

  async submitApplication(
    ownerId: string,
    details: {
      name?: string;
      description?: string;
      city?: string;
      contactEmail?: string;
      websiteUrl?: string;
    },
    files: UploadedShelterDocument[],
  ) {
    await this.assertShelterOwner(ownerId);
    this.assertValidDocuments(files);

    const existing = await this.prismaService.shelter.findUnique({
      where: { ownerId },
      select: {
        id: true,
        applicationStatus: true,
        documents: { select: { fileUrl: true } },
      },
    });

    if (existing?.applicationStatus === ShelterApplicationStatus.APPROVED) {
      throw new ForbiddenException(
        'An approved shelter application cannot be replaced.',
      );
    }

    const documents = await this.storeDocuments(files);

    try {
      const shelter = await this.prismaService.$transaction(async (tx) => {
        if (existing) {
          await tx.shelterDocument.deleteMany({
            where: { shelterId: existing.id },
          });
          return tx.shelter.update({
            where: { id: existing.id },
            data: {
              name: this.requireText(details.name, 'shelter name'),
              description: this.normalizeText(details.description),
              city: this.normalizeText(details.city),
              contactEmail: this.normalizeEmail(details.contactEmail),
              websiteUrl: this.normalizeOptionalHttpsUrl(details.websiteUrl),
              isVerified: false,
              applicationStatus: ShelterApplicationStatus.PENDING,
              reviewNote: null,
              reviewedAt: null,
              reviewedById: null,
              documents: { create: documents },
            },
            select: shelterSelect,
          });
        }

        return tx.shelter.create({
          data: {
            name: this.requireText(details.name, 'shelter name'),
            description: this.normalizeText(details.description),
            city: this.normalizeText(details.city),
            contactEmail: this.normalizeEmail(details.contactEmail),
            websiteUrl: this.normalizeOptionalHttpsUrl(details.websiteUrl),
            ownerId,
            documents: { create: documents },
          },
          select: shelterSelect,
        });
      });

      if (existing) {
        await this.removeStoredDocuments(existing.documents.map((item) => item.fileUrl));
      }

      return shelter;
    } catch (error) {
      await this.removeStoredDocuments(documents.map((item) => item.fileUrl));
      throw error;
    }
  }

  async reviewApplication(
    id: string,
    status: ShelterApplicationStatus,
    reviewerId: string,
    reviewNote?: string,
  ) {
    if (
      status !== ShelterApplicationStatus.APPROVED &&
      status !== ShelterApplicationStatus.DECLINED
    ) {
      throw new BadRequestException(
        'Shelter applications can only be approved or declined.',
      );
    }

    const shelter = await this.prismaService.shelter.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!shelter) {
      throw new NotFoundException(`Shelter with id "${id}" was not found`);
    }

    const normalizedNote = this.normalizeText(reviewNote);
    if (status === ShelterApplicationStatus.DECLINED && !normalizedNote) {
      throw new BadRequestException(
        'A review note is required when declining an application.',
      );
    }

    return this.prismaService.shelter.update({
      where: { id },
      data: {
        applicationStatus: status,
        isVerified: status === ShelterApplicationStatus.APPROVED,
        reviewNote: normalizedNote,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
      select: shelterSelect,
    });
  }

  async getDocumentForAdmin(documentId: string) {
    const document = await this.prismaService.shelterDocument.findUnique({
      where: { id: documentId },
      select: {
        fileName: true,
        fileUrl: true,
        mimeType: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Shelter document not found.');
    }

    const fileName = document.fileUrl.replace('shelter-documents/', '');
    const filePath = join(
      process.cwd(),
      'private',
      'shelter-documents',
      fileName,
    );

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Shelter document file not found.');
    }

    return { ...document, filePath };
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

  assertApplicationDetails(details: {
    name?: string;
    contactEmail?: string;
    websiteUrl?: string;
  }) {
    this.requireText(details.name, 'shelter name');
    this.normalizeEmail(details.contactEmail);
    this.normalizeOptionalHttpsUrl(details.websiteUrl);
  }

  assertValidDocuments(files: UploadedShelterDocument[]) {
    if (files.length < MIN_DOCUMENTS || files.length > MAX_DOCUMENTS) {
      throw new BadRequestException(
        `Upload between ${MIN_DOCUMENTS} and ${MAX_DOCUMENTS} documents.`,
      );
    }

    for (const file of files) {
      const extension = ACCEPTED_DOCUMENT_TYPES.get(file.mimetype);
      if (!file.buffer || !extension || file.buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
        throw new BadRequestException(
          'Documents must be PDF, PNG, JPG, or JPEG files up to 10 MB each.',
        );
      }

      const originalExtension = extname(file.originalname).toLowerCase();
      if (
        originalExtension &&
        originalExtension !== extension &&
        !(file.mimetype === 'image/jpeg' && originalExtension === '.jpeg')
      ) {
        throw new BadRequestException(
          'The document file extension does not match its content type.',
        );
      }
    }
  }

  private async storeDocuments(files: UploadedShelterDocument[]) {
    const uploadsDirectory = join(
      process.cwd(),
      'private',
      'shelter-documents',
    );
    await mkdir(uploadsDirectory, { recursive: true });
    const documents: Array<{
      fileName: string;
      fileUrl: string;
      mimeType: string;
    }> = [];

    try {
      for (const file of files) {
        const extension = ACCEPTED_DOCUMENT_TYPES.get(file.mimetype)!;
        const fileName = `${randomUUID()}${extension}`;
        await writeFile(join(uploadsDirectory, fileName), file.buffer);
        documents.push({
          fileName: file.originalname,
          fileUrl: `shelter-documents/${fileName}`,
          mimeType: file.mimetype,
        });
      }
      return documents;
    } catch (error) {
      await this.removeStoredDocuments(documents.map((item) => item.fileUrl));
      throw error;
    }
  }

  private async removeStoredDocuments(urls: string[]) {
    await Promise.all(
      urls.map(async (url) => {
        const fileName = url.replace('shelter-documents/', '');
        await unlink(join(process.cwd(), 'private', 'shelter-documents', fileName)).catch(
          () => undefined,
        );
      }),
    );
  }

  private requireText(value: string | undefined, field: string) {
    const normalized = this.normalizeText(value);
    if (!normalized) {
      throw new BadRequestException(`${field} is required.`);
    }
    return normalized;
  }

  private normalizeText(value?: string | null) {
    return value?.trim() || null;
  }

  private normalizeEmail(value?: string | null) {
    const email = this.normalizeText(value);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('A valid contact email is required.');
    }
    return email;
  }

  private normalizeOptionalHttpsUrl(value?: string | null) {
    const normalized = this.normalizeUrl(value);
    if (value?.trim() && !normalized) {
      throw new BadRequestException('Website URL must use HTTPS.');
    }
    return normalized;
  }
}
