import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { PetsModule } from './pets/pets.module';
import { PrismaModule } from './prisma/prisma.module';
import { SheltersModule } from './shelters/shelters.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AdminModule,
    PrismaModule,
    AuthModule,
    ChatModule,
    UsersModule,
    SheltersModule,
    PetsModule,
  ],
})
export class AppModule {}
