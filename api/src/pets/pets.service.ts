import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PetAdoptionStatus,
  PetGender,
  PetSize,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthUser } from '../auth/jwt-auth.guard';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

type UploadedPetFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

const petSelect = {
  id: true,
  name: true,
  species: true,
  speciesId: true,
  speciesRecord: { select: { id: true, enName: true, huName: true } },
  breedId: true,
  breedRecord: {
    select: {
      id: true,
      enName: true,
      huName: true,
      speciesId: true,
      species: { select: { id: true, enName: true, huName: true } },
    },
  },
  ageYears: true,
  ageMonths: true,
  gender: true,
  size: true,
  location: true,
  city: true,
  latitude: true,
  longitude: true,
  description: true,
  goodWithChildren: true,
  goodWithDogs: true,
  goodWithCats: true,
  vaccinated: true,
  neutered: true,
  houseTrained: true,
  adoptionStatus: true,
  photoUrls: true,
  ownerId: true,
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PetSelect;

const MAX_PHOTOS = 8;
const MIN_PHOTOS = 2;

type PetFilters = {
  search?: string;
  species?: string;
  breed?: string;
  breedId?: string;
  gender?: string;
  size?: string;
  adoptionStatus?: string;
  location?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  goodWithChildren?: string;
  goodWithDogs?: string;
  goodWithCats?: string;
  vaccinated?: string;
  neutered?: string;
  houseTrained?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortByDistance?: string;
};

@Injectable()
export class PetsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(page = 1, limit = 10, filters: PetFilters = {}) {
    const safePage = Math.max(1, Math.trunc(page || 1));
    const safeLimit = Math.max(1, Math.min(24, Math.trunc(limit || 10)));
    const skip = (safePage - 1) * safeLimit;
    const where = this.buildFilters(filters);

    const hasRadiusFilter = this.hasRadiusFilter(filters);
    const shouldCalculateDistance =
      hasRadiusFilter || this.hasLocationCoordinates(filters);
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.pet.findMany({
        select: petSelect,
        where,
        orderBy: {
          createdAt: 'desc',
        },
        ...(shouldCalculateDistance ? {} : { skip, take: safeLimit }),
      }),
      hasRadiusFilter
        ? this.prismaService.pet.count({ where })
        : this.prismaService.pet.count({ where }),
    ]);

    if (shouldCalculateDistance) {
      const nearbyItems = hasRadiusFilter
        ? items.filter((pet) =>
            this.isWithinRadius(pet.latitude, pet.longitude, filters),
          )
        : items;
      if (filters.sortByDistance === 'true') {
        nearbyItems.sort(
          (left, right) =>
            this.distanceKm(left.latitude, left.longitude, filters) -
            this.distanceKm(right.latitude, right.longitude, filters),
        );
      }
      return {
        items: nearbyItems.slice(skip, skip + safeLimit),
        page: safePage,
        limit: safeLimit,
        total: nearbyItems.length,
        totalPages: Math.max(1, Math.ceil(nearbyItems.length / safeLimit)),
      };
    }

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async searchLocations(query?: string) {
    const search = query?.trim();
    if (!search || search.length < 3) return [];

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(search)}`,
      {
        headers: { 'User-Agent': 'Floofs/1.0 (pet-adoption-location-search)' },
      },
    );
    if (!response.ok)
      throw new BadRequestException('Location search is unavailable.');

    const results = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;
    return results.map((result) => ({
      label: this.formatLocationLabel(result.address, result.display_name),
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      city: this.getCity(result.address),
    }));
  }

  async findSpecies(search?: string, limit = 12, locale?: string) {
    const safeLimit = Math.max(1, Math.min(25, Math.trunc(limit || 12)));
    const normalizedSearch = search?.trim();

    return this.prismaService.species.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { enName: { contains: normalizedSearch, mode: 'insensitive' } },
              { huName: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { id: true, enName: true, huName: true },
      orderBy: locale?.toLowerCase().startsWith('hu')
        ? { huName: 'asc' }
        : { enName: 'asc' },
      take: safeLimit,
    });
  }

  async findBreeds(
    search?: string,
    species?: string,
    limit = 12,
    locale?: string,
  ) {
    const safeLimit = Math.max(1, Math.min(25, Math.trunc(limit || 12)));
    const normalizedSearch = search?.trim();
    const normalizedSpecies = species?.trim();

    return this.prismaService.breed.findMany({
      where: {
        ...(normalizedSearch
          ? {
              OR: [
                {
                  enName: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  huName: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
        ...(normalizedSpecies
          ? {
              species: {
                enName: { equals: normalizedSpecies, mode: 'insensitive' },
              },
            }
          : {}),
      },
      select: {
        id: true,
        enName: true,
        huName: true,
        speciesId: true,
        species: { select: { enName: true, huName: true } },
      },
      orderBy: locale?.toLowerCase().startsWith('hu')
        ? { huName: 'asc' }
        : { enName: 'asc' },
      take: safeLimit,
    });
  }

  findById(id: string) {
    return this.prismaService.pet.findUnique({
      select: petSelect,
      where: { id },
    });
  }

  findByOwner(ownerId: string) {
    return this.prismaService.pet.findMany({
      select: petSelect,
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFavorites(userId: string) {
    const favorites = await this.prismaService.favorite.findMany({
      where: { userId },
      select: { pet: { select: petSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((favorite) => favorite.pet);
  }

  async addFavorite(petId: string, userId: string) {
    await this.assertPetExists(petId);
    await this.prismaService.favorite.upsert({
      where: { userId_petId: { userId, petId } },
      create: { userId, petId },
      update: {},
    });

    return { favorited: true };
  }

  async removeFavorite(petId: string, userId: string) {
    await this.prismaService.favorite.deleteMany({ where: { userId, petId } });

    return { favorited: false };
  }

  async create(
    createPetDto: CreatePetDto,
    ownerId: string,
    files: UploadedPetFile[] = [],
  ) {
    this.assertValidPhotoCount(files);
    const species = this.requireText(createPetDto.species, 'species');
    const speciesRecord = await this.resolveSpecies(species);
    const breed = await this.resolveBreed(
      createPetDto.breedId,
      speciesRecord.id,
    );

    const photoUrls = await this.storePhotos(files);
    const geography = await this.resolveGeography(createPetDto);

    try {
      return await this.prismaService.pet.create({
        data: {
          name: this.requireText(createPetDto.name, 'name'),
          species,
          speciesId: speciesRecord.id,
          breedId: breed?.id,
          ageYears: this.normalizeNullableInt(createPetDto.ageYears),
          ageMonths: this.normalizeNullableInt(createPetDto.ageMonths),
          gender: createPetDto.gender ?? PetGender.UNKNOWN,
          size: createPetDto.size ?? PetSize.MEDIUM,
          location: this.requireText(createPetDto.location, 'location'),
          city: geography?.city,
          latitude: geography?.latitude,
          longitude: geography?.longitude,
          description: this.requireText(
            createPetDto.description,
            'description',
          ),
          goodWithChildren: this.normalizeBoolean(
            createPetDto.goodWithChildren,
          ),
          goodWithDogs: this.normalizeBoolean(createPetDto.goodWithDogs),
          goodWithCats: this.normalizeBoolean(createPetDto.goodWithCats),
          vaccinated: this.normalizeBoolean(createPetDto.vaccinated),
          neutered: this.normalizeBoolean(createPetDto.neutered),
          houseTrained: this.normalizeBoolean(createPetDto.houseTrained),
          adoptionStatus: PetAdoptionStatus.AVAILABLE,
          photoUrls,
          ownerId,
        },
        select: petSelect,
      });
    } catch (error) {
      await this.removeStoredPhotos(photoUrls);
      throw error;
    }
  }

  async update(
    id: string,
    updatePetDto: UpdatePetDto,
    files: UploadedPetFile[] = [],
    requester?: JwtAuthUser,
  ) {
    const existingPet = await this.assertPetExists(id);
    this.assertCanManagePet(existingPet.ownerId, requester);
    const totalPhotoCount = existingPet.photoUrls.length + files.length;

    if (totalPhotoCount < MIN_PHOTOS) {
      throw new BadRequestException(
        `At least ${MIN_PHOTOS} photos are required.`,
      );
    }

    if (totalPhotoCount > MAX_PHOTOS) {
      throw new BadRequestException(
        `A maximum of ${MAX_PHOTOS} photos can be uploaded.`,
      );
    }

    const uploadedPhotoUrls =
      files.length > 0 ? await this.storePhotos(files) : null;
    const requestedSpecies = this.normalizeText(updatePetDto.species);
    const requestedLocation = this.normalizeText(updatePetDto.location);
    const speciesRecord = await this.resolveSpecies(
      requestedSpecies ?? existingPet.species,
    );
    const breed = await this.resolveBreed(
      updatePetDto.breedId,
      speciesRecord.id,
    );
    const geography = requestedLocation
      ? await this.resolveGeography(updatePetDto)
      : null;

    try {
      const updatedPet = await this.prismaService.pet.update({
        where: { id },
        data: {
          name: this.normalizeText(updatePetDto.name),
          species: requestedSpecies,
          speciesId: requestedSpecies ? speciesRecord.id : undefined,
          ...(updatePetDto.breedId !== undefined
            ? { breedId: breed?.id ?? null }
            : {}),
          ageYears: this.normalizeNullableInt(updatePetDto.ageYears),
          ageMonths: this.normalizeNullableInt(updatePetDto.ageMonths),
          gender: updatePetDto.gender,
          size: updatePetDto.size,
          location: this.normalizeText(updatePetDto.location),
          ...(requestedLocation
            ? {
                city: geography?.city ?? null,
                latitude: geography?.latitude ?? null,
                longitude: geography?.longitude ?? null,
              }
            : {}),
          description: this.normalizeText(updatePetDto.description),
          goodWithChildren: this.normalizeBoolean(
            updatePetDto.goodWithChildren,
          ),
          goodWithDogs: this.normalizeBoolean(updatePetDto.goodWithDogs),
          goodWithCats: this.normalizeBoolean(updatePetDto.goodWithCats),
          vaccinated: this.normalizeBoolean(updatePetDto.vaccinated),
          neutered: this.normalizeBoolean(updatePetDto.neutered),
          houseTrained: this.normalizeBoolean(updatePetDto.houseTrained),
          adoptionStatus: updatePetDto.adoptionStatus,
          photoUrls: uploadedPhotoUrls
            ? [...existingPet.photoUrls, ...uploadedPhotoUrls]
            : existingPet.photoUrls,
        },
        select: petSelect,
      });

      return updatedPet;
    } catch (error) {
      if (uploadedPhotoUrls) {
        await this.removeStoredPhotos(uploadedPhotoUrls);
      }

      throw error;
    }
  }

  async remove(id: string, requester?: JwtAuthUser) {
    const pet = await this.assertPetExists(id);
    this.assertCanManagePet(pet.ownerId, requester);

    await this.prismaService.pet.delete({
      where: { id },
    });

    await this.removeStoredPhotos(pet.photoUrls);

    return { deleted: true };
  }

  private buildFilters(filters: PetFilters): Prisma.PetWhereInput {
    const where: Prisma.PetWhereInput = {};
    const search = filters.search?.trim();

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { species: { contains: search, mode: 'insensitive' } },
        {
          breedRecord: {
            is: {
              OR: [
                { enName: { contains: search, mode: 'insensitive' } },
                { huName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters.species?.trim()) {
      where.species = { contains: filters.species.trim(), mode: 'insensitive' };
    }

    if (filters.breed?.trim()) {
      where.breedRecord = {
        is: {
          OR: [
            {
              enName: {
                contains: filters.breed.trim(),
                mode: 'insensitive',
              },
            },
            {
              huName: {
                contains: filters.breed.trim(),
                mode: 'insensitive',
              },
            },
          ],
        },
      };
    }
    if (filters.breedId?.trim()) {
      where.breedId = filters.breedId.trim();
    }

    if (Object.values(PetGender).includes(filters.gender as PetGender)) {
      where.gender = filters.gender as PetGender;
    }

    if (Object.values(PetSize).includes(filters.size as PetSize)) {
      where.size = filters.size as PetSize;
    }

    if (
      Object.values(PetAdoptionStatus).includes(
        filters.adoptionStatus as PetAdoptionStatus,
      )
    ) {
      where.adoptionStatus = filters.adoptionStatus as PetAdoptionStatus;
    }

    const ageYears: Prisma.IntNullableFilter = {};

    if (Number.isFinite(filters.maxAgeYears) && filters.maxAgeYears! >= 0) {
      ageYears.lte = Math.trunc(filters.maxAgeYears!);
    }

    if (Number.isFinite(filters.minAgeYears) && filters.minAgeYears! >= 0) {
      ageYears.gte = Math.trunc(filters.minAgeYears!);
    }

    if (Object.keys(ageYears).length > 0) {
      where.ageYears = ageYears;
    }

    if (filters.location?.trim()) {
      where.location = {
        contains: filters.location.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.goodWithChildren === 'true') {
      where.goodWithChildren = true;
    }
    if (filters.goodWithDogs === 'true') {
      where.goodWithDogs = true;
    }
    if (filters.goodWithCats === 'true') {
      where.goodWithCats = true;
    }
    if (filters.vaccinated === 'true') {
      where.vaccinated = true;
    }
    if (filters.neutered === 'true') {
      where.neutered = true;
    }
    if (filters.houseTrained === 'true') {
      where.houseTrained = true;
    }

    return where;
  }

  private hasRadiusFilter(filters: PetFilters) {
    return (
      this.hasLocationCoordinates(filters) &&
      Number.isFinite(filters.radiusKm) &&
      filters.radiusKm! > 0
    );
  }

  private hasLocationCoordinates(filters: PetFilters) {
    return (
      Number.isFinite(filters.latitude) && Number.isFinite(filters.longitude)
    );
  }

  private isWithinRadius(
    latitude: number | null,
    longitude: number | null,
    filters: PetFilters,
  ) {
    if (
      !this.hasRadiusFilter(filters) ||
      latitude === null ||
      longitude === null
    )
      return false;
    return this.distanceKm(latitude, longitude, filters) <= filters.radiusKm!;
  }

  private distanceKm(
    latitude: number | null,
    longitude: number | null,
    filters: PetFilters,
  ) {
    if (latitude === null || longitude === null)
      return Number.POSITIVE_INFINITY;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(latitude - filters.latitude!);
    const longitudeDelta = toRadians(longitude - filters.longitude!);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(filters.latitude!)) *
        Math.cos(toRadians(latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async geocodeLocation(location?: string) {
    const address = this.requireText(location, 'location');
    const [result] = await this.searchLocations(address);
    return result ?? null;
  }

  private async resolveGeography(
    petDto: Pick<
      CreatePetDto | UpdatePetDto,
      'location' | 'city' | 'latitude' | 'longitude'
    >,
  ) {
    const latitude = this.normalizeCoordinate(petDto.latitude, -90, 90);
    const longitude = this.normalizeCoordinate(petDto.longitude, -180, 180);
    const city = this.normalizeNullableText(petDto.city);

    if (latitude !== null && longitude !== null) {
      return { city, latitude, longitude };
    }

    return this.geocodeLocation(petDto.location);
  }

  private normalizeCoordinate(
    value: string | number | null | undefined,
    minimum: number,
    maximum: number,
  ) {
    const coordinate = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(coordinate) &&
      coordinate >= minimum &&
      coordinate <= maximum
      ? coordinate
      : null;
  }

  private getCity(address?: Record<string, string>) {
    return (
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      address?.county ??
      null
    );
  }

  private formatLocationLabel(
    address: Record<string, string> | undefined,
    fallback: string,
  ) {
    const country = address?.country;
    const county = address?.county ?? address?.state;
    const city = this.getCity(address);
    const region = [country, county].filter(Boolean).join(' ');

    return [region, city].filter(Boolean).join(' - ') || fallback;
  }

  private assertCanManagePet(ownerId: string | null, requester?: JwtAuthUser) {
    if (
      requester?.role !== UserRole.ADMIN &&
      (!requester?.sub || requester.sub !== ownerId)
    ) {
      throw new ForbiddenException(
        'You can only manage your own pet listings.',
      );
    }
  }

  private async assertPetExists(id: string) {
    const pet = await this.prismaService.pet.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        species: true,
        photoUrls: true,
      },
    });

    if (!pet) {
      throw new NotFoundException(`Pet with id "${id}" was not found`);
    }

    return pet;
  }

  private async resolveSpecies(speciesName: string) {
    const species = await this.prismaService.species.findFirst({
      where: { enName: { equals: speciesName, mode: 'insensitive' } },
      select: { id: true, enName: true },
    });

    if (!species) {
      throw new BadRequestException('Select a valid species.');
    }

    return species;
  }

  private async resolveBreed(
    breedId: string | null | undefined,
    speciesId: string,
  ) {
    const normalizedBreedId = this.normalizeNullableText(breedId);

    if (!normalizedBreedId) {
      return null;
    }

    const breed = await this.prismaService.breed.findUnique({
      where: { id: normalizedBreedId },
      select: { id: true, enName: true, speciesId: true },
    });

    if (!breed || breed.speciesId !== speciesId) {
      throw new BadRequestException(
        'Select a breed that matches the pet species.',
      );
    }

    return breed;
  }

  private assertValidPhotoCount(
    files: UploadedPetFile[] = [],
    allowEmpty = false,
  ) {
    if (allowEmpty && files.length === 0) {
      return;
    }

    if (files.length < MIN_PHOTOS) {
      throw new BadRequestException(
        `At least ${MIN_PHOTOS} photos are required.`,
      );
    }

    if (files.length > MAX_PHOTOS) {
      throw new BadRequestException(
        `A maximum of ${MAX_PHOTOS} photos can be uploaded.`,
      );
    }
  }

  private async storePhotos(files: UploadedPetFile[]) {
    if (files.length === 0) {
      return [];
    }

    const uploadsDirectory = join(process.cwd(), 'uploads', 'pets');
    await mkdir(uploadsDirectory, { recursive: true });

    const storedUrls: string[] = [];

    for (const file of files) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${randomUUID()}-${safeName || 'pet-photo'}${extname(file.originalname) || '.jpg'}`;
      const filePath = join(uploadsDirectory, fileName);

      await writeFile(filePath, file.buffer);
      storedUrls.push(`/uploads/pets/${fileName}`);
    }

    return storedUrls;
  }

  private async removeStoredPhotos(photoUrls: string[]) {
    await Promise.all(
      photoUrls.map(async (photoUrl) => {
        const filePath = join(process.cwd(), photoUrl.replace(/^\//, ''));

        try {
          await unlink(filePath);
        } catch {
          // Ignore missing files so cleanup stays best-effort.
        }
      }),
    );
  }

  private requireText(value: string | undefined, fieldName: string) {
    const normalized = this.normalizeText(value);

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private normalizeText(value: string | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : undefined;
  }

  private normalizeNullableText(value: string | null | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  private normalizeNullableInt(value: string | number | null | undefined) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.trunc(parsed);
  }

  private normalizeBoolean(value: string | boolean | null | undefined) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
    }

    return false;
  }
}
