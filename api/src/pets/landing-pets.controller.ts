import { Controller, Get } from '@nestjs/common';
import { PetsService } from './pets.service';

@Controller('landing')
export class LandingPetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get('pets')
  findFeatured() {
    return this.petsService.findFeatured();
  }
}
