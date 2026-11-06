import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';

type SupportQuestionPayload = {
  question?: string;
  language?: string;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

@Controller('support')
export class PublicSupportController {
  private readonly requestWindows = new Map<string, number[]>();

  constructor(private readonly chatService: ChatService) {}

  @Post('questions')
  async answerQuestion(
    @Body() payload: SupportQuestionPayload,
    @Req() request: Request,
  ) {
    this.assertRateLimit(request.ip || 'unknown');
    return this.chatService.answerSupportQuestion(
      payload.question ?? '',
      payload.language ?? 'en',
    );
  }

  private assertRateLimit(clientIp: string) {
    const now = Date.now();
    const requestTimes = (this.requestWindows.get(clientIp) ?? []).filter(
      (timestamp) => now - timestamp < WINDOW_MS,
    );

    if (requestTimes.length >= MAX_REQUESTS_PER_WINDOW) {
      this.requestWindows.set(clientIp, requestTimes);
      throw new HttpException(
        'Too many support questions. Please try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    requestTimes.push(now);
    this.requestWindows.set(clientIp, requestTimes);
  }
}
