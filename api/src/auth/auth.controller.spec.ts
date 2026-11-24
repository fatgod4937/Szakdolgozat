import { INestApplication } from '@nestjs/common';
import { Server } from 'net';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IdentityVerificationStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiditVerificationService } from './didit-verification.service';
import { IdentityVerificationGuard } from './identity-verification.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('Auth HTTP endpoints', () => {
  let app: INestApplication;
  const httpServer = (): Server => {
    const server: unknown = app.getHttpServer();
    if (!(server instanceof Server)) throw new Error('Expected HTTP server');
    return server;
  };
  const result = { ok: true };
  const service = {
    register: jest.fn(),
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    getDeactivationStatus: jest.fn(),
    refresh: jest.fn(),
    verifyEmail: jest.fn(),
    getVerificationPageUrl: jest.fn(),
    me: jest.fn(),
    updateProfile: jest.fn(),
    updateProfilePicture: jest.fn(),
    changePassword: jest.fn(),
    changeEmail: jest.fn(),
    changePhoneNumber: jest.fn(),
    deleteAccount: jest.fn(),
  };
  const didit = { createSession: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const user = {
    sub: 'user-1',
    email: 'user@example.test',
    role: UserRole.USER,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: DiditVerificationService, useValue: didit },
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            verify: (token: string) => {
              if (token !== 'valid-token') throw new Error('Invalid token');
              return user;
            },
          },
        },
        JwtAuthGuard,
        IdentityVerificationGuard,
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of Object.values(service)) mock.mockReturnValue(result);
    didit.createSession.mockReturnValue(result);
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      identityVerificationStatus: IdentityVerificationStatus.APPROVED,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    [
      'register',
      '/api/auth/register',
      { email: 'a@example.test' },
      'register',
      [{ email: 'a@example.test' }, 'hu'],
    ],
    [
      'login',
      '/api/auth/login',
      { email: 'a@example.test', passwordHash: 'hash' },
      'login',
      [{ email: 'a@example.test', passwordHash: 'hash' }],
    ],
    [
      'request reset',
      '/api/auth/forgot-password',
      { email: 'a@example.test' },
      'requestPasswordReset',
      ['a@example.test', 'hu'],
    ],
    [
      'reset password',
      '/api/auth/reset-password',
      { token: 'reset-token', passwordHash: 'hash' },
      'resetPassword',
      ['reset-token', 'hash'],
    ],
    [
      'refresh',
      '/api/auth/refresh',
      { refreshToken: 'refresh-token' },
      'refresh',
      ['refresh-token'],
    ],
  ] as const)(
    '%s forwards its payload',
    async (_name, url, body, method, args) => {
      const response = await request(httpServer())
        .post(url)
        .set('Accept-Language', 'hu')
        .send(body)
        .expect(201);
      expect(response.body).toEqual(result);
      expect(service[method]).toHaveBeenCalledWith(...args);
    },
  );

  it.each([
    [
      '/api/auth/deactivation-status?email=a%40example.test',
      'getDeactivationStatus',
      'a@example.test',
    ],
    [
      '/api/auth/verify-email?token=verify-token',
      'verifyEmail',
      'verify-token',
    ],
  ] as const)('GET %s forwards the query', async (url, method, value) => {
    const response = await request(httpServer()).get(url).expect(200);
    expect(response.body).toEqual(result);
    expect(service[method]).toHaveBeenCalledWith(value);
  });

  it('redirects browser verification requests to the web application', async () => {
    service.getVerificationPageUrl.mockReturnValue(
      'https://example.test/verify-email?token=abc',
    );
    await request(httpServer())
      .get('/api/auth/verify-email?token=abc')
      .set('Accept', 'text/html')
      .expect(302)
      .expect('Location', 'https://example.test/verify-email?token=abc');
    expect(service.getVerificationPageUrl).toHaveBeenCalledWith('abc');
    expect(service.verifyEmail).not.toHaveBeenCalled();
  });

  it('returns the authenticated user', async () => {
    const response = await request(httpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    expect(response.body).toEqual(result);
    expect(service.me).toHaveBeenCalledWith('user-1');
  });

  it.each([
    [
      '/api/auth/me',
      'updateProfile',
      { firstName: 'Ada' },
      ['user-1', { firstName: 'Ada' }],
    ],
    [
      '/api/auth/me/password',
      'changePassword',
      { passwordHash: 'new-hash' },
      ['user-1', { passwordHash: 'new-hash' }],
    ],
    [
      '/api/auth/me/email',
      'changeEmail',
      { email: 'new@example.test' },
      ['user-1', { email: 'new@example.test' }, 'hu'],
    ],
    [
      '/api/auth/me/phone-number',
      'changePhoneNumber',
      { phoneNumber: '+36201234567' },
      ['user-1', { phoneNumber: '+36201234567' }],
    ],
    [
      '/api/auth/me/delete',
      'deleteAccount',
      { passwordHash: 'hash' },
      ['user-1', { passwordHash: 'hash' }],
    ],
  ] as const)(
    'POST %s forwards the authenticated user and payload',
    async (url, method, body, args) => {
      const response = await request(httpServer())
        .post(url)
        .set('Authorization', 'Bearer valid-token')
        .set('Accept-Language', 'hu')
        .send(body)
        .expect(201);
      expect(response.body).toEqual(result);
      expect(service[method]).toHaveBeenCalledWith(...args);
    },
  );

  it('passes the uploaded profile picture to the service', async () => {
    await request(httpServer())
      .post('/api/auth/me/profile-picture')
      .set('Authorization', 'Bearer valid-token')
      .attach('profilePicture', Buffer.from('image'), {
        filename: 'profile.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(service.updateProfilePicture).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        originalname: 'profile.png',
        mimetype: 'image/png',
        buffer: Buffer.from('image'),
      }),
    );
  });

  it('starts a Didit session for the authenticated user', async () => {
    await request(httpServer())
      .post('/api/auth/didit/session')
      .set('Authorization', 'Bearer valid-token')
      .expect(201);
    expect(didit.createSession).toHaveBeenCalledWith('user-1');
  });

  it.each([undefined, 'Bearer invalid'])(
    'rejects missing or invalid credentials',
    async (authorization) => {
      const call = request(httpServer()).get('/api/auth/me');
      if (authorization) call.set('Authorization', authorization);
      await call.expect(401);
      expect(service.me).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['get', '/api/auth/me'],
    ['post', '/api/auth/me'],
    ['post', '/api/auth/me/profile-picture'],
    ['post', '/api/auth/didit/session'],
    ['post', '/api/auth/me/password'],
    ['post', '/api/auth/me/email'],
    ['post', '/api/auth/me/phone-number'],
    ['post', '/api/auth/me/delete'],
  ] as const)('%s %s rejects unauthenticated requests', async (verb, url) => {
    await request(httpServer())[verb](url).expect(401);
  });

  it('rejects unverified users from identity-protected account changes', async () => {
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      identityVerificationStatus: IdentityVerificationStatus.IN_REVIEW,
    });
    await request(httpServer())
      .post('/api/auth/me/email')
      .set('Authorization', 'Bearer valid-token')
      .send({ email: 'new@example.test' })
      .expect(403);
    expect(service.changeEmail).not.toHaveBeenCalled();
  });
});
