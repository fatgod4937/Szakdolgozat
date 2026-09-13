import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { JwtAuthUser } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

type ChatSocket = Socket & {
  data: {
    user?: JwtAuthUser;
  };
};

type SendMessagePayload = {
  threadId: string;
  ciphertext: string;
  nonce: string;
  senderDeviceId: string;
  keyEnvelopes: Array<{
    deviceId: string;
    ciphertext: string;
    nonce: string;
  }>;
};

type JoinThreadPayload = {
  threadId: string;
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: ChatSocket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      client.data.user = this.jwtService.verify<JwtAuthUser>(token);
      client.join(this.getUserRoom(client.data.user.sub));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join_thread')
  async joinThread(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: JoinThreadPayload,
  ) {
    const userId = this.requireUserId(client);
    const thread = await this.chatService.getThreadById(
      payload.threadId,
      userId,
    );

    client.join(this.getThreadRoom(thread.id));

    return {
      ok: true,
      threadId: thread.id,
    };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const userId = this.requireUserId(client);
    const thread = await this.chatService.getThreadById(
      payload.threadId,
      userId,
    );
    const message = await this.chatService.sendMessage(
      payload.threadId,
      userId,
      payload,
    );

    this.server
      .to(this.getThreadRoom(payload.threadId))
      .emit('message_created', message);
    const recipientId =
      thread.ownerId === userId ? thread.adopterId : thread.ownerId;
    this.server
      .to(this.getUserRoom(recipientId))
      .emit('message_created', message);

    return {
      ok: true,
      message,
    };
  }

  private requireUserId(client: ChatSocket) {
    const userId = client.data.user?.sub;

    if (!userId) {
      throw new Error('Unauthorized socket connection');
    }

    return userId;
  }

  private extractToken(client: ChatSocket) {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim()) {
      return this.normalizeToken(authToken);
    }

    const authorization = client.handshake.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    return this.normalizeToken(authorization);
  }

  private normalizeToken(token: string) {
    const trimmed = token.trim();

    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }

    return trimmed;
  }

  private getThreadRoom(threadId: string) {
    return `thread:${threadId}`;
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}
