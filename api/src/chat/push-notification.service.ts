import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly isConfigured: boolean;

  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    const publicKey = configService.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = configService.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = configService.get<string>('VAPID_SUBJECT')?.trim();

    this.isConfigured = Boolean(publicKey && privateKey && subject);

    if (this.isConfigured) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    } else {
      this.logger.warn(
        'Web push is disabled. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT to enable it.',
      );
    }
  }

  async saveSubscription(userId: string, payload: PushSubscriptionPayload) {
    return this.prismaService.pushSubscription.upsert({
      where: { endpoint: payload.endpoint },
      create: {
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      update: {
        userId,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      select: { endpoint: true },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prismaService.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { removed: true };
  }

  async notifyNewChatMessage(
    userId: string,
    petName: string,
    threadId: string,
  ) {
    if (!this.isConfigured) {
      return;
    }

    const subscriptions = await this.prismaService.pushSubscription.findMany({
      where: { userId },
    });
    const payload = JSON.stringify({
      title: 'New Floofs message',
      body: `You have a new message about ${petName}.`,
      url: `/chat/thread/${threadId}`,
      tag: `chat-${threadId}`,
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
          );
        } catch (error) {
          const statusCode =
            typeof error === 'object' && error !== null && 'statusCode' in error
              ? error.statusCode
              : undefined;

          if (statusCode === 404 || statusCode === 410) {
            await this.prismaService.pushSubscription.delete({
              where: { endpoint: subscription.endpoint },
            });
            return;
          }

          this.logger.warn(
            `Could not deliver a push notification: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }),
    );
  }
}
