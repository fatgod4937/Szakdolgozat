import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, JwtAuthUser } from '../auth/jwt-auth.guard';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetsService } from './pets.service';

type JwtRequest = Request & {
  user?: JwtAuthUser;
};

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('species') species?: string,
    @Query('breed') breed?: string,
    @Query('breedId') breedId?: string,
    @Query('gender') gender?: string,
    @Query('size') size?: string,
    @Query('adoptionStatus') adoptionStatus?: string,
    @Query('location') location?: string,
    @Query('minAgeYears') minAgeYears?: string,
    @Query('maxAgeYears') maxAgeYears?: string,
    @Query('goodWithChildren') goodWithChildren?: string,
    @Query('goodWithDogs') goodWithDogs?: string,
    @Query('goodWithCats') goodWithCats?: string,
    @Query('vaccinated') vaccinated?: string,
    @Query('neutered') neutered?: string,
    @Query('houseTrained') houseTrained?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('sortByDistance') sortByDistance?: string,
  ) {
    return this.petsService.findAll(Number(page), Number(limit), {
      search,
      species,
      breed,
      breedId,
      gender,
      size,
      adoptionStatus,
      location,
      minAgeYears: Number(minAgeYears),
      maxAgeYears: Number(maxAgeYears),
      goodWithChildren,
      goodWithDogs,
      goodWithCats,
      vaccinated,
      neutered,
      houseTrained,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm: Number(radiusKm),
      sortByDistance,
    });
  }

  @Get('breeds')
  findBreeds(
    @Query('search') search?: string,
    @Query('species') species?: string,
    @Query('limit') limit?: string,
    @Query('locale') locale?: string,
  ) {
    return this.petsService.findBreeds(search, species, Number(limit), locale);
  }

  @Get('species')
  findSpecies(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('locale') locale?: string,
  ) {
    return this.petsService.findSpecies(search, Number(limit), locale);
  }

  @Get('locations')
  searchLocations(@Query('query') query?: string) {
    return this.petsService.searchLocations(query);
  }

  @Get('mine/listings')
  findMine(@Req() request: JwtRequest) {
    return this.petsService.findByOwner(request.user?.sub ?? '');
  }

  @Get('mine/favorites')
  findFavorites(@Req() request: JwtRequest) {
    return this.petsService.findFavorites(request.user?.sub ?? '');
  }

  @Post(':id/favorite')
  addFavorite(@Param('id') id: string, @Req() request: JwtRequest) {
    return this.petsService.addFavorite(id, request.user?.sub ?? '');
  }

  @Delete(':id/favorite')
  removeFavorite(@Param('id') id: string, @Req() request: JwtRequest) {
    return this.petsService.removeFavorite(id, request.user?.sub ?? '');
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.petsService.findById(id);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 8 }]))
  create(
    @Body() createPetDto: CreatePetDto,
    @Req() request: JwtRequest,
    @UploadedFiles()
    files: {
      photos?: Array<{
        originalname: string;
        buffer: Buffer;
        mimetype: string;
      }>;
    },
  ) {
    return this.petsService.create(
      createPetDto,
      request.user?.sub ?? '',
      files.photos ?? [],
    );
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 8 }]))
  update(
    @Param('id') id: string,
    @Body() updatePetDto: UpdatePetDto,
    @Req() request: JwtRequest,
    @UploadedFiles()
    files: {
      photos?: Array<{
        originalname: string;
        buffer: Buffer;
        mimetype: string;
      }>;
    },
  ) {
    return this.petsService.update(
      id,
      updatePetDto,
      files.photos ?? [],
      request.user,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: JwtRequest) {
    return this.petsService.remove(id, request.user);
  }
}
