import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { IdentityVerificationStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthUser } from './jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user?: JwtAuthUser;
};

@Injectable()
export class IdentityVerificationGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.role === UserRole.ADMIN || this.isOnboardingRequest(request)) {
      return true;
    }

    const account = await this.prismaService.user.findUnique({
      where: { id: user.sub },
      select: { identityVerificationStatus: true },
    });

    if (
      account?.identityVerificationStatus !==
      IdentityVerificationStatus.APPROVED
    ) {
      throw new ForbiddenException('IDENTITY_VERIFICATION_REQUIRED');
    }

    return true;
  }

  private isOnboardingRequest(request: Request) {
    const path = request.originalUrl
      .split('?')[0]
      .replace(/^\/api(?=\/)/, '');

    return (
      (request.method === 'GET' && path === '/auth/me') ||
      (request.method === 'POST' &&
        (path === '/auth/me' ||
          path === '/auth/me/profile-picture' ||
          path === '/auth/didit/session' ||
          path === '/auth/me/delete'))
    );
  }
}
