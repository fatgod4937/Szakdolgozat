import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LandingPetsController } from './landing-pets.controller';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PetsController, LandingPetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
