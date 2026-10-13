import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityVerificationStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DiditWebhookService } from './didit-webhook.service';

const secret = 'didit-test-secret';

function signV2(payload: object) {
  const canonicalPayload = JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
  return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}

describe('DiditWebhookService', () => {
  const payload = {
    event_id: 'event-1',
    session_id: 'session-1',
    status: 'Approved',
    webhook_type: 'status.updated',
    vendor_data: 'user-1',
    timestamp: Math.floor(Date.now() / 1000),
  };

  it('updates the linked user after a valid approved event', async () => {
    const tx = {
      diditWebhookEvent: { create: jest.fn() },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'user-1' })
          .mockResolvedValueOnce(null),
        update: jest.fn(),
      },
    };
    const prisma = {
      diditWebhookEvent: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new DiditWebhookService(
      { get: jest.fn().mockReturnValue(secret) } as ConfigService,
      prisma as PrismaService,
    );

    await expect(
      service.process({
        payload,
        signatureV2: signV2(payload),
      }),
    ).resolves.toEqual({ received: true, duplicate: false });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        diditSessionId: 'session-1',
        identityVerificationStatus: IdentityVerificationStatus.APPROVED,
        identityVerifiedAt: expect.any(Date),
      },
    });
  });

  it('rejects a webhook with an invalid signature before persistence', async () => {
    const prisma = {
      diditWebhookEvent: { findUnique: jest.fn() },
    };
    const service = new DiditWebhookService(
      { get: jest.fn().mockReturnValue(secret) } as ConfigService,
      prisma as PrismaService,
    );

    await expect(
      service.process({
        payload,
        signatureV2: '0'.repeat(64),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.diditWebhookEvent.findUnique).not.toHaveBeenCalled();
  });

  it('acknowledges a duplicate event without processing it again', async () => {
    const prisma = {
      diditWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue({ eventId: payload.event_id }),
      },
    };
    const service = new DiditWebhookService(
      { get: jest.fn().mockReturnValue(secret) } as ConfigService,
      prisma as PrismaService,
    );

    await expect(
      service.process({
        payload,
        signatureV2: signV2(payload),
      }),
    ).resolves.toEqual({ received: true, duplicate: true });
  });
});
