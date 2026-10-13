import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DiditVerificationService } from './didit-verification.service';
import { IdentityVerificationGuard } from './identity-verification.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'floofs-dev-secret',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiditVerificationService,
    JwtAuthGuard,
    IdentityVerificationGuard,
    AdminGuard,
  ],
  exports: [
    DiditVerificationService,
    JwtAuthGuard,
    IdentityVerificationGuard,
    AdminGuard,
    JwtModule,
  ],
})
export class AuthModule {}
