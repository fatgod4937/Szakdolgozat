import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IdentityVerificationStatus,
  Prisma,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

const statusMap: Record<string, IdentityVerificationStatus> = {
  'Not Started': IdentityVerificationStatus.NOT_STARTED,
  'In Progress': IdentityVerificationStatus.IN_PROGRESS,
  Approved: IdentityVerificationStatus.APPROVED,
  Declined: IdentityVerificationStatus.DECLINED,
  'In Review': IdentityVerificationStatus.IN_REVIEW,
  Abandoned: IdentityVerificationStatus.ABANDONED,
  Expired: IdentityVerificationStatus.EXPIRED,
  'Kyc Expired': IdentityVerificationStatus.KYC_EXPIRED,
  Resubmitted: IdentityVerificationStatus.RESUBMITTED,
};

type DiditPayload = {
  event_id?: unknown;
  session_id?: unknown;
  status?: unknown;
  webhook_type?: unknown;
  vendor_data?: unknown;
  timestamp?: unknown;
};

type DiditWebhookRequest = {
  rawBody?: Buffer;
  payload: unknown;
  signatureV2?: string;
  signature?: string;
};

@Injectable()
export class DiditWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async process(request: DiditWebhookRequest) {
    const secret = this.configService.get<string>('DIDIT_WEBHOOK_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'DIDIT_WEBHOOK_SECRET is not configured.',
      );
    }

    this.assertValidSignature(request, secret);

    const payload = this.assertPayload(request.payload);
    this.assertFreshTimestamp(payload.timestamp);
    const existingEvent =
      await this.prismaService.diditWebhookEvent.findUnique({
        where: { eventId: payload.eventId },
        select: { eventId: true },
      });

    if (existingEvent) {
      return { received: true, duplicate: true };
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.diditWebhookEvent.create({
        data: {
          eventId: payload.eventId,
          sessionId: payload.sessionId,
          webhookType: payload.webhookType,
          status: payload.status,
        },
      });

      if (payload.webhookType !== 'status.updated' || !payload.sessionId) {
        return;
      }

      const identityVerificationStatus = statusMap[payload.status ?? ''];
      if (!identityVerificationStatus) {
        throw new BadRequestException('Unsupported Didit verification status.');
      }

      const userId = this.getVendorDataUserId(request.payload);
      const [user, sessionOwner] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }),
        tx.user.findUnique({
          where: { diditSessionId: payload.sessionId },
          select: { id: true },
        }),
      ]);

      if (!user) {
        throw new UnprocessableEntityException(
          'Didit vendor_data does not identify a user.',
        );
      }

      if (sessionOwner && sessionOwner.id !== user.id) {
        throw new UnprocessableEntityException(
          'Didit session is linked to a different user.',
        );
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          diditSessionId: payload.sessionId,
          identityVerificationStatus,
          identityVerifiedAt:
            identityVerificationStatus === IdentityVerificationStatus.APPROVED
              ? new Date()
              : undefined,
        },
      });
    });

    return { received: true, duplicate: false };
  }

  private assertFreshTimestamp(timestamp: number) {
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > MAX_WEBHOOK_AGE_SECONDS
    ) {
      throw new UnauthorizedException('Expired Didit webhook timestamp.');
    }
  }

  private assertValidSignature(request: DiditWebhookRequest, secret: string) {
    const signature = request.signatureV2 ?? request.signature;
    if (!signature) {
      throw new UnauthorizedException('Missing Didit webhook signature.');
    }

    const signedContent = request.signatureV2
      ? this.canonicalize(request.payload)
      : request.rawBody?.toString('utf8');

    if (!signedContent) {
      throw new BadRequestException('Didit webhook body is unavailable.');
    }

    const expected = createHmac('sha256', secret)
      .update(signedContent, 'utf8')
      .digest('hex');
    if (!this.signaturesMatch(signature, expected)) {
      throw new UnauthorizedException('Invalid Didit webhook signature.');
    }
  }

  private assertPayload(payload: unknown) {
    if (!this.isRecord(payload)) {
      throw new BadRequestException('Didit webhook payload must be an object.');
    }

    const eventId = this.requiredString(payload.event_id, 'event_id');
    const webhookType = this.requiredString(payload.webhook_type, 'webhook_type');
    const sessionId = this.optionalString(payload.session_id, 'session_id');
    const status = this.optionalString(payload.status, 'status');
    const timestamp = this.requiredNumber(payload.timestamp, 'timestamp');

    return { eventId, webhookType, sessionId, status, timestamp };
  }

  private getVendorDataUserId(payload: unknown) {
    if (!this.isRecord(payload)) {
      throw new BadRequestException('Didit webhook payload must be an object.');
    }

    return this.requiredString(payload.vendor_data, 'vendor_data');
  }

  private canonicalize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }

    if (this.isRecord(value)) {
      return `{${Object.keys(value)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.canonicalize(value[key])}`,
        )
        .join(',')}}`;
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new BadRequestException('Didit webhook payload is invalid.');
    }

    return serialized;
  }

  private signaturesMatch(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }

  private requiredString(value: unknown, name: string) {
    const result = this.optionalString(value, name);
    if (!result) {
      throw new BadRequestException(`Didit webhook ${name} is required.`);
    }

    return result;
  }

  private optionalString(value: unknown, name: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`Didit webhook ${name} must be a string.`);
    }

    return value.trim();
  }

  private requiredNumber(value: unknown, name: string) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new BadRequestException(`Didit webhook ${name} must be an integer.`);
    }

    return value;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
