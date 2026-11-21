import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  DonationsController,
  StripeWebhookController,
} from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DonationsController, StripeWebhookController],
  providers: [DonationsService],
})
export class DonationsModule {}
