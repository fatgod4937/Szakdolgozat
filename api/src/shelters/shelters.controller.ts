import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SheltersService } from './shelters.service';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

@Controller('shelters')
@UseGuards(JwtAuthGuard)
export class SheltersController {
  constructor(private readonly sheltersService: SheltersService) {}

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
