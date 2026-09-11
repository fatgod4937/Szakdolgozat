import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PetsModule } from '../pets/pets.module';
import { SheltersModule } from '../shelters/shelters.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, PetsModule, SheltersModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
