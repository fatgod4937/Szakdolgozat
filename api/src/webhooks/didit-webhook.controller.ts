import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { DiditWebhookService } from './didit-webhook.service';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Controller('webhooks')
export class DiditWebhookController {
  constructor(private readonly diditWebhookService: DiditWebhookService) {}

  @Post('didit')
  receive(
    @Req() request: RawBodyRequest,
    @Body() payload: unknown,
    @Headers('x-signature-v2') signatureV2?: string,
    @Headers('x-signature') signature?: string,
  ) {
    return this.diditWebhookService.process({
      rawBody: request.rawBody,
      payload,
      signatureV2,
      signature,
    });
  }
}
