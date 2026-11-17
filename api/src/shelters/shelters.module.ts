import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SheltersController } from './shelters.controller';
import { ShelterRegistrationController } from './shelter-registration.controller';
import { SheltersService } from './shelters.service';

@Module({
  imports: [AuthModule],
  controllers: [SheltersController, ShelterRegistrationController],
  providers: [SheltersService],
  exports: [SheltersService],
})
export class SheltersModule {}
