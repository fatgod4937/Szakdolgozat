import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityVerificationGuard } from '../auth/identity-verification.guard';
import { JwtAuthUser } from '../auth/jwt-auth.guard';
import { SheltersService } from './shelters.service';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

type JwtRequest = Request & { user?: JwtAuthUser };

@Controller('shelters')
@UseGuards(JwtAuthGuard, IdentityVerificationGuard)
export class SheltersController {
  constructor(private readonly sheltersService: SheltersService) {}

  @Get('me/donation-settings')
  getDonationSettings(@Req() request: JwtRequest) {
    return this.sheltersService.getDonationSettings(request.user?.sub ?? '');
  }

  @Get('me/application')
  getMyApplication(@Req() request: JwtRequest) {
    return this.sheltersService.getMyApplication(request.user?.sub ?? '');
  }

  @Post('me/application')
  @UseInterceptors(FilesInterceptor('documents', 5))
  submitApplication(
    @Req() request: JwtRequest,
    @Body()
    details: {
      name?: string;
      description?: string;
      city?: string;
      contactEmail?: string;
      websiteUrl?: string;
    },
    @UploadedFiles()
    files: Array<{
      originalname: string;
      buffer: Buffer;
      mimetype: string;
    }> = [],
  ) {
    return this.sheltersService.submitApplication(
      request.user?.sub ?? '',
      details,
      files,
    );
  }

  @Patch('me/donation-settings')
  updateDonationSettings(
    @Req() request: JwtRequest,
    @Body()
    settings: {
      donationIban?: string | null;
      paypalDonationUrl?: string | null;
      donationUrl?: string | null;
      donationUrlLabel?: string | null;
    },
  ) {
    return this.sheltersService.updateDonationSettings(
      request.user?.sub ?? '',
      settings,
    );
  }

  @Get()
  findAll() {
    return this.sheltersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.sheltersService.findById(id);
  }

  @Post()
  create(@Body() createShelterDto: CreateShelterDto) {
    return this.sheltersService.create(createShelterDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShelterDto: UpdateShelterDto) {
    return this.sheltersService.update(id, updateShelterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sheltersService.remove(id);
  }
}
