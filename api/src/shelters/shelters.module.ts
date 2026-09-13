import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SheltersController } from './shelters.controller';
import { SheltersService } from './shelters.service';

@Module({
  imports: [AuthModule],
  controllers: [SheltersController],
  providers: [SheltersService],
  exports: [SheltersService],
})
export class SheltersModule {}
