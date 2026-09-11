import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PushNotificationService } from './push-notification.service';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule, ConfigModule, PrismaModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, PushNotificationService],
})
export class ChatModule {}
