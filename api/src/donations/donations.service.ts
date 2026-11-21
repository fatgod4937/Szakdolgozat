import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const CURRENCY_LIMITS: Record<string, { min: number; max: number }> = {
  huf: { min: 500, max: 1_000_000 },
  eur: { min: 2, max: 5_000 },
};

export type CreateDonationInput = {
  amount?: unknown;
  currency?: unknown;
  message?: unknown;
};

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);
  private stripeClient?: Stripe;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  isConfigured() {
    return Boolean(this.configService.get<string>('STRIPE_SECRET_KEY'));
  }

  async createCheckout(
    donorId: string,
    shelterId: string,
    input: CreateDonationInput,
  ) {
    const stripe = this.getStripe();
    const currency =
      typeof input.currency === 'string' ? input.currency.toLowerCase() : 'huf';
    const limits = CURRENCY_LIMITS[currency];

    if (!limits) {
      throw new BadRequestException('Unsupported donation currency.');
    }

    const amount = Number(input.amount);
    if (
      !Number.isInteger(amount) ||
      amount < limits.min ||
      amount > limits.max
    ) {
      throw new BadRequestException(
        `The donation must be a whole number between ${limits.min} and ${limits.max} ${currency.toUpperCase()}.`,
      );
    }

    const message =
      typeof input.message === 'string' ? input.message.trim() : '';
    if (message.length > 300) {
      throw new BadRequestException(
        'The donation message must be 300 characters or less.',
      );
    }

    const shelter = await this.prismaService.shelter.findUnique({
      where: { id: shelterId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isVerified: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
      },
    });

    if (!shelter) {
      throw new NotFoundException('Shelter not found.');
    }

    if (
      !shelter.isVerified ||
      !shelter.stripeAccountId ||
      !shelter.stripeChargesEnabled
    ) {
      throw new BadRequestException(
        'This shelter cannot accept card donations yet.',
      );
    }

    if (shelter.ownerId === donorId) {
      throw new ForbiddenException('You cannot donate to your own shelter.');
    }

    const minorAmount = amount * 100;
    const platformFee = Math.round(
      (minorAmount * this.getPlatformFeePercent()) / 100,
    );
    const donation = await this.prismaService.donation.create({
      data: {
        shelterId: shelter.id,
        donorId,
        amount: minorAmount,
        currency,
        platformFee,
        message: message || null,
      },
      select: { id: true },
    });
    const webUrl = this.getWebUrl();

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: donation.id,
        metadata: { donationId: donation.id, shelterId: shelter.id },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: minorAmount,
              product_data: { name: `Donation to ${shelter.name}` },
            },
          },
        ],
        payment_intent_data: {
          description: `Floofs donation to ${shelter.name}`,
          transfer_data: { destination: shelter.stripeAccountId },
          ...(platformFee > 0 ? { application_fee_amount: platformFee } : {}),
        },
        success_url: `${webUrl}/profiles/shelters/${shelter.id}?donation=success`,
        cancel_url: `${webUrl}/profiles/shelters/${shelter.id}?donation=cancelled`,
      });

      await this.prismaService.donation.update({
        where: { id: donation.id },
        data: { stripeSessionId: session.id },
      });

      return { url: session.url };
    } catch (error) {
      await this.prismaService.donation.update({
        where: { id: donation.id },
        data: { status: DonationStatus.EXPIRED },
      });
      this.logStripeError('Could not create a checkout session', error);
      throw new ServiceUnavailableException(
        'The payment provider is unavailable. Please try again later.',
      );
    }
  }

  async startOnboarding(ownerId: string) {
    const stripe = this.getStripe();
    const shelter = await this.requireOwnedShelter(ownerId);

    if (!shelter.isVerified) {
      throw new ForbiddenException(
        'Your shelter must be approved by an administrator before you can accept donations.',
      );
    }

    let accountId = shelter.stripeAccountId;
    const webUrl = this.getWebUrl();

    try {
      if (!accountId) {
        const account = await stripe.v2.core.accounts.create({
          contact_email:
            shelter.contactEmail ?? shelter.owner?.email ?? undefined,
          display_name: shelter.name,
          dashboard: 'express',
          identity: {
            country: (
              this.configService.get<string>('STRIPE_ACCOUNT_COUNTRY') ?? 'HU'
            ).toLowerCase(),
          },
          defaults: {
            responsibilities: {
              fees_collector: 'application',
              losses_collector: 'stripe',
            },
          },
          configuration: {
            merchant: { capabilities: { card_payments: { requested: true } } },
            recipient: {
              capabilities: {
                stripe_balance: { stripe_transfers: { requested: true } },
              },
            },
          },
          metadata: { shelterId: shelter.id },
        });
        accountId = account.id;
        await this.prismaService.shelter.update({
          where: { id: shelter.id },
          data: { stripeAccountId: accountId },
        });
      } else {
        // Accounts created before transfers were requested need the capability.
        await stripe.v2.core.accounts.update(accountId, {
          contact_email:
            shelter.contactEmail ?? shelter.owner?.email ?? undefined,
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: { stripe_transfers: { requested: true } },
              },
            },
          },
        });
      }

      const link = await stripe.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            refresh_url: `${webUrl}/settings?section=donations&stripe=refresh`,
            return_url: `${webUrl}/settings?section=donations&stripe=return`,
          },
        },
      });

      return { url: link.url };
    } catch (error) {
      this.logStripeError('Could not start Stripe onboarding', error);
      throw new ServiceUnavailableException(
        'Could not start Stripe onboarding. Please try again later.',
      );
    }
  }

  async getStatus(ownerId: string) {
    const shelter = await this.requireOwnedShelter(ownerId);
    let { stripeChargesEnabled, stripeDetailsSubmitted } = shelter;

    if (this.isConfigured() && shelter.stripeAccountId) {
      try {
        const account = await this.getStripe().v2.core.accounts.retrieve(
          shelter.stripeAccountId,
          { include: ['configuration.merchant', 'configuration.recipient', 'requirements'] },
        );
        stripeChargesEnabled =
          account.configuration?.merchant?.capabilities?.card_payments
            ?.status === 'active' &&
          account.configuration?.recipient?.capabilities?.stripe_balance
            ?.stripe_transfers?.status === 'active';
        stripeDetailsSubmitted =
          !account.requirements?.summary?.minimum_deadline;
        await this.prismaService.shelter.update({
          where: { id: shelter.id },
          data: { stripeChargesEnabled, stripeDetailsSubmitted },
        });
      } catch (error) {
        this.logStripeError('Could not refresh the Stripe account', error);
      }
    }

    return {
      configured: this.isConfigured(),
      isVerified: shelter.isVerified,
      connected: Boolean(shelter.stripeAccountId),
      chargesEnabled: stripeChargesEnabled,
      detailsSubmitted: stripeDetailsSubmitted,
    };
  }

  async createDashboardLink(ownerId: string) {
    const stripe = this.getStripe();
    const shelter = await this.requireOwnedShelter(ownerId);

    if (!shelter.stripeAccountId || !shelter.stripeDetailsSubmitted) {
      throw new BadRequestException(
        'Finish the Stripe onboarding before opening your Stripe dashboard.',
      );
    }

    try {
      const link = await stripe.accounts.createLoginLink(
        shelter.stripeAccountId,
      );
      return { url: link.url };
    } catch (error) {
      this.logStripeError('Could not create a Stripe dashboard link', error);
      throw new ServiceUnavailableException(
        'Could not open the Stripe dashboard. Please try again later.',
      );
    }
  }

  async listReceived(ownerId: string) {
    const shelter = await this.requireOwnedShelter(ownerId);

    return this.prismaService.donation.findMany({
      where: { shelterId: shelter.id, status: DonationStatus.PAID },
      select: {
        id: true,
        amount: true,
        currency: true,
        message: true,
        paidAt: true,
        donor: { select: { firstName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 50,
    });
  }

  async handleWebhook(rawBody: Buffer | undefined, signature?: string) {
    const secrets = [
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      this.configService.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET'),
    ].filter((secret): secret is string => Boolean(secret));

    if (!rawBody || !signature || secrets.length === 0) {
      throw new BadRequestException('Invalid webhook request.');
    }

    const stripe = this.getStripe();
    let event: Stripe.Event | undefined;

    for (const secret of secrets) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        break;
      } catch {}
    }

    if (!event) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await this.markPaid(session);
        }
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        await this.prismaService.donation.updateMany({
          where: {
            stripeSessionId: event.data.object.id,
            status: DonationStatus.PENDING,
          },
          data: { status: DonationStatus.EXPIRED },
        });
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        await this.prismaService.shelter.updateMany({
          where: { stripeAccountId: account.id },
          data: {
            stripeChargesEnabled: account.charges_enabled === true,
            stripeDetailsSubmitted: account.details_submitted === true,
          },
        });
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async markPaid(session: Stripe.Checkout.Session) {
    const donationId = session.metadata?.donationId;

    await this.prismaService.donation.updateMany({
      where: {
        status: { not: DonationStatus.PAID },
        ...(donationId ? { id: donationId } : { stripeSessionId: session.id }),
      },
      data: {
        status: DonationStatus.PAID,
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
      },
    });
  }

  private async requireOwnedShelter(ownerId: string) {
    const shelter = await this.prismaService.shelter.findUnique({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        isVerified: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripeDetailsSubmitted: true,
        owner: { select: { email: true } },
      },
    });

    if (!shelter) {
      throw new ForbiddenException(
        'Only shelter accounts with a shelter profile can use this feature.',
      );
    }

    return shelter;
  }

  private getStripe() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Card donations are not configured on this server.',
      );
    }

    this.stripeClient ??= new Stripe(secretKey);
    return this.stripeClient;
  }

  private getPlatformFeePercent() {
    const percent = Number(
      this.configService.get<string>('STRIPE_PLATFORM_FEE_PERCENT') ?? 0,
    );

    return Number.isFinite(percent) && percent > 0 && percent < 50
      ? percent
      : 0;
  }

  private getWebUrl() {
    return (
      this.configService.get<string>('WEB_APP_URL') ?? 'https://localhost:5173'
    ).replace(/\/+$/, '');
  }

  private logStripeError(context: string, error: unknown) {
    this.logger.error(
      `${context}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
