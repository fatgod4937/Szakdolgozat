import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { ShelterRegistrationController } from '../shelters/shelter-registration.controller';
import { SheltersService } from '../shelters/shelters.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiditVerificationService } from './didit-verification.service';
import { IdentityVerificationGuard } from './identity-verification.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { hashPassword } from './utils/password-hash.util';

const sendEmail = jest.fn();
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  readFile: jest.fn().mockResolvedValue(Buffer.from('logo')),
}));
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendEmail } })),
}));

describe('localized account emails', () => {
  let app: INestApplication;
  const user = {
    id: 'user-1',
    email: 'user@example.test',
    firstName: '<Ada>',
    isActive: true,
    passwordHash: hashPassword('password'),
    role: UserRole.USER,
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController, ShelterRegistrationController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                RESEND_API_KEY: 'test-key',
                RESEND_FROM: 'from@example.test',
                WEB_APP_URL: 'https://floofs.example',
              })[key],
          },
        },
        { provide: DiditVerificationService, useValue: {} },
        {
          provide: SheltersService,
          useValue: {
            assertValidDocuments: jest.fn(),
            assertApplicationDetails: jest.fn(),
            submitApplication: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = { sub: user.id };
          return true;
        },
      })
      .overrideGuard(IdentityVerificationGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    sendEmail.mockReset().mockResolvedValue({ error: null });
    prisma.user.findUnique.mockReset().mockResolvedValue(null);
    prisma.user.create.mockReset().mockResolvedValue(user);
    prisma.user.update.mockReset().mockResolvedValue(user);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('sends Hungarian verification for registration, including shelter registration', async () => {
    const registration = {
      email: user.email,
      passwordHash: 'password',
      firstName: user.firstName,
      lastName: 'Example',
      acceptDataSafety: true,
    };
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Accept-Language', 'hu-HU')
      .send(registration)
      .expect(201);
    await request(app.getHttpServer())
      .post('/shelter-registrations')
      .set('Accept-Language', 'hu')
      .field('email', user.email)
      .field('passwordHash', 'password')
      .field('firstName', user.firstName)
      .field('lastName', 'Example')
      .field('acceptDataSafety', 'true')
      .expect(201);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    for (const [email] of sendEmail.mock.calls) {
      expect(email.subject).toBe('Erősítsd meg a Floofs-fiókodat');
      expect(email.html).toContain('<html lang="hu">');
      expect(email.html).toContain('E-mail-cím megerősítése');
      expect(email.html).toContain('&lt;Ada&gt;');
      expect(email.html).toContain('/verify-email?token=');
    }
  });

  it('uses the requested language for password reset and email changes', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .set('Accept-Language', 'hu')
      .send({ email: user.email })
      .expect(201);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      subject: 'Floofs-jelszó visszaállítása',
      html: expect.stringContaining('Jelszó visszaállítása'),
    });
    expect(sendEmail.mock.calls[0][0].html).toContain('/reset-password?token=');

    await request(app.getHttpServer())
      .post('/auth/me/email')
      .set('Accept-Language', 'hu')
      .send({ email: 'new@example.test', currentPasswordHash: 'password' })
      .expect(201);
    expect(sendEmail.mock.calls[1][0]).toMatchObject({
      to: 'new@example.test',
      subject: 'Erősítsd meg a Floofs-fiókodat',
    });
  });

  it('falls back to English for unsupported or missing languages', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    for (const language of [undefined, 'de-DE']) {
      const call = request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: user.email });
      if (language) call.set('Accept-Language', language);
      await call.expect(201);
    }
    for (const [email] of sendEmail.mock.calls) {
      expect(email.subject).toBe('Reset your Floofs password');
      expect(email.html).toContain('<html lang="en">');
      expect(email.html).toContain('Reset password');
    }
  });

  it('sends English verification when English is preferred', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Accept-Language', 'en, hu;q=0.5')
      .send({
        email: user.email,
        passwordHash: 'password',
        firstName: user.firstName,
        lastName: 'Example',
        acceptDataSafety: true,
      })
      .expect(201);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      subject: 'Verify your Floofs account',
      html: expect.stringContaining('Verify email address'),
    });
    expect(sendEmail.mock.calls[0][0].html).toContain('<html lang="en">');
    expect(sendEmail.mock.calls[0][0].html).toContain('&lt;Ada&gt;');
  });
});
