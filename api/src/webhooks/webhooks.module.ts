import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiditWebhookController } from './didit-webhook.controller';
import { DiditWebhookService } from './didit-webhook.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiditWebhookController],
  providers: [DiditWebhookService],
})
export class WebhooksModule {}
