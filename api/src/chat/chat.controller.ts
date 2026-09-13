import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

type JwtRequest = Request & {
  user?: {
    sub: string;
  };
};

type RegisterDevicePayload = {
  id?: string;
  publicKey?: string;
};

type ChatKeyBackupPayload = {
  ciphertext?: string;
  nonce?: string;
  salt?: string;
};

type SupportQuestionPayload = {
  question?: string;
  language?: string;
};

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  listThreads(@Req() request: JwtRequest) {
    return this.chatService.listThreads(request.user?.sub ?? '');
  }

  @Get('pets/:petId/thread')
  getThreadForPet(@Param('petId') petId: string, @Req() request: JwtRequest) {
    return this.chatService.getThreadForPet(request.user?.sub ?? '', petId);
  }

  @Get('threads/:threadId')
  getThreadConversation(
    @Param('threadId') threadId: string,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.getThreadConversation(
      request.user?.sub ?? '',
      threadId,
    );
  }

  @Get('threads/:threadId/messages')
  getMessages(@Param('threadId') threadId: string, @Req() request: JwtRequest) {
    return this.chatService.getMessages(threadId, request.user?.sub ?? '');
  }

  @Post('threads/:threadId/read')
  markThreadRead(
    @Param('threadId') threadId: string,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.markThreadRead(threadId, request.user?.sub ?? '');
  }

  @Post('push-subscriptions')
  savePushSubscription(
    @Body() payload: PushSubscriptionPayload,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.savePushSubscription(
      request.user?.sub ?? '',
      payload.endpoint ?? '',
      payload.keys?.p256dh ?? '',
      payload.keys?.auth ?? '',
    );
  }

  @Delete('push-subscriptions')
  removePushSubscription(
    @Body('endpoint') endpoint: string,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.removePushSubscription(
      request.user?.sub ?? '',
      endpoint ?? '',
    );
  }

  @Post('devices')
  registerDevice(
    @Body() payload: RegisterDevicePayload,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.registerDevice(
      request.user?.sub ?? '',
      payload.id ?? '',
      payload.publicKey ?? '',
    );
  }

  @Get('threads/:threadId/devices')
  getThreadDevices(
    @Param('threadId') threadId: string,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.getThreadDevices(threadId, request.user?.sub ?? '');
  }

  @Get('key-backup')
  async getKeyBackup(@Req() request: JwtRequest) {
    return {
      backup: await this.chatService.getKeyBackup(request.user?.sub ?? ''),
    };
  }

  @Post('key-backup')
  saveKeyBackup(
    @Body() payload: ChatKeyBackupPayload,
    @Req() request: JwtRequest,
  ) {
    return this.chatService.saveKeyBackup(
      request.user?.sub ?? '',
      payload.ciphertext ?? '',
      payload.nonce ?? '',
      payload.salt ?? '',
    );
  }

  @Post('support')
  answerSupportQuestion(@Body() payload: SupportQuestionPayload) {
    return this.chatService.answerSupportQuestion(
      payload.question ?? '',
      payload.language ?? 'en',
    );
  }
}
