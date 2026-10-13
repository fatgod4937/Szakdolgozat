import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type DiditSessionResponse = {
  session_id?: unknown;
  url?: unknown;
};

@Injectable()
export class DiditVerificationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async createSession(userId: string) {
    const apiKey = this.configService.get<string>('DIDIT_API_KEY');
    const workflowId = this.configService.get<string>('DIDIT_WORKFLOW_ID');
    const webAppUrl = this.configService.get<string>('WEB_APP_URL');

    if (!apiKey || !workflowId || !webAppUrl) {
      throw new InternalServerErrorException(
        'Didit identity verification is not configured.',
      );
    }

    let response: Response;
    try {
      response = await fetch('https://verification.didit.me/v3/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          vendor_data: userId,
          callback: `${webAppUrl}/onboarding`,
          callback_method: 'both',
        }),
      });
    } catch (error) {
      throw new BadGatewayException(
        `Could not create Didit verification session: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    const responseBody: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(
        'Didit could not create an identity verification session.',
      );
    }

    if (!this.isSessionResponse(responseBody)) {
      throw new BadGatewayException(
        'Didit returned an invalid identity verification session.',
      );
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { diditSessionId: responseBody.session_id },
    });

    return {
      sessionId: responseBody.session_id,
      url: responseBody.url,
    };
  }

  private isSessionResponse(value: unknown): value is {
    session_id: string;
    url: string;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'session_id' in value &&
      typeof value.session_id === 'string' &&
      'url' in value &&
      typeof value.url === 'string'
    );
  }
}
