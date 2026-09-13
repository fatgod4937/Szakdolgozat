import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePetDto } from '../pets/dto/update-pet.dto';
import { PetsService } from '../pets/pets.service';
import { SheltersService } from '../shelters/shelters.service';
import { UsersService } from '../users/users.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly petsService: PetsService,
    private readonly sheltersService: SheltersService,
    private readonly usersService: UsersService,
  ) {}

  @Get('shelters')
  findShelters() {
    return this.sheltersService.findAll();
  }

  @Patch('shelters/:id/approval')
  updateShelterApproval(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.sheltersService.setVerification(id, isVerified);
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
