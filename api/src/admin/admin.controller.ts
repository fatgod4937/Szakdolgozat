import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { Request } from 'express';
import { createReadStream } from 'fs';
import { ShelterApplicationStatus } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityVerificationGuard } from '../auth/identity-verification.guard';
import { UpdatePetDto } from '../pets/dto/update-pet.dto';
import { PetsService } from '../pets/pets.service';
import { ProfilesService } from '../profiles/profiles.service';
import { SheltersService } from '../shelters/shelters.service';
import { UsersService } from '../users/users.service';

type JwtRequest = Request & { user?: { sub: string } };

@Controller('admin')
@UseGuards(JwtAuthGuard, IdentityVerificationGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly petsService: PetsService,
    private readonly profilesService: ProfilesService,
    private readonly sheltersService: SheltersService,
    private readonly usersService: UsersService,
  ) {}

  @Get('shelters')
  findShelters() {
    return this.sheltersService.findAll();
  }

  @Patch('shelters/:id/review')
  reviewShelterApplication(
    @Param('id') id: string,
    @Body('status') status: ShelterApplicationStatus,
    @Body('reviewNote') reviewNote: string | undefined,
    @Req() request: JwtRequest,
  ) {
    return this.sheltersService.reviewApplication(
      id,
      status,
      request.user?.sub ?? '',
      reviewNote,
    );
  }

  @Get('shelter-documents/:id')
  async downloadShelterDocument(@Param('id') id: string) {
    const document = await this.sheltersService.getDocumentForAdmin(id);
    return new StreamableFile(createReadStream(document.filePath), {
      type: document.mimeType,
      disposition: `inline; filename="${document.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
    });
  }

  @Get('pets')
  findPets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.petsService.findAll(Number(page), Number(limit), { search });
  }

  @Get('users')
  findUsers(@Query('search') search?: string) {
    return this.usersService.findAll(search);
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.usersService.setActiveStatus(id, isActive === true, reason);
  }

  @Get('profile-comments/disputes')
  listCommentDisputes() {
    return this.profilesService.listDisputedComments();
  }

  @Delete('profile-comments/:id')
  removeProfileComment(@Param('id') id: string, @Req() request: JwtRequest) {
    return this.profilesService.removeComment(id, request.user?.sub ?? '');
  }

  @Patch('pets/:id')
  updatePet(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petsService.update(id, updatePetDto, [], {
      sub: '',
      email: '',
      role: 'ADMIN',
    });
  }

  @Delete('pets/:id')
  removePet(@Param('id') id: string) {
    return this.petsService.remove(id, { sub: '', email: '', role: 'ADMIN' });
  }
}
