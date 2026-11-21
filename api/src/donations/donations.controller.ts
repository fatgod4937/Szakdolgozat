import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IdentityVerificationGuard } from '../auth/identity-verification.guard';
import { JwtAuthGuard, JwtAuthUser } from '../auth/jwt-auth.guard';
import { type CreateDonationInput, DonationsService } from './donations.service';

type JwtRequest = Request & { user?: JwtAuthUser };
type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('donations')
@UseGuards(JwtAuthGuard, IdentityVerificationGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('shelters/:shelterId/checkout')
  createCheckout(
    @Req() request: JwtRequest,
    @Param('shelterId') shelterId: string,
    @Body() input: CreateDonationInput,
  ) {
    return this.donationsService.createCheckout(
      request.user?.sub ?? '',
      shelterId,
      input,
    );
  }

  @Get('shelter/status')
  getStatus(@Req() request: JwtRequest) {
    return this.donationsService.getStatus(request.user?.sub ?? '');
  }

  @Post('shelter/onboarding')
  startOnboarding(@Req() request: JwtRequest) {
    return this.donationsService.startOnboarding(request.user?.sub ?? '');
  }

  @Post('shelter/dashboard')
  createDashboardLink(@Req() request: JwtRequest) {
    return this.donationsService.createDashboardLink(request.user?.sub ?? '');
  }

  @Get('shelter/received')
  listReceived(@Req() request: JwtRequest) {
    return this.donationsService.listReceived(request.user?.sub ?? '');
  }
}

@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('stripe')
  receive(
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.donationsService.handleWebhook(request.rawBody, signature);
  }
}
