import { INestApplication, NotFoundException } from '@nestjs/common';
import { Server } from 'net';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IdentityVerificationStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AdminController } from './admin/admin.controller';
import { AdminGuard } from './auth/admin.guard';
import { IdentityVerificationGuard } from './auth/identity-verification.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatController } from './chat/chat.controller';
import { PublicSupportController } from './chat/public-support.controller';
import { ChatService } from './chat/chat.service';
import {
  DonationsController,
  StripeWebhookController,
} from './donations/donations.controller';
import { DonationsService } from './donations/donations.service';
import { LandingPetsController } from './pets/landing-pets.controller';
import { PetsController } from './pets/pets.controller';
import { PetsService } from './pets/pets.service';
import { PrismaService } from './prisma/prisma.service';
import { ProfilesController } from './profiles/profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { SheltersController } from './shelters/shelters.controller';
import { SheltersService } from './shelters/shelters.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { DiditWebhookController } from './webhooks/didit-webhook.controller';
import { DiditWebhookService } from './webhooks/didit-webhook.service';

type Verb = 'get' | 'post' | 'patch' | 'delete';
type ServiceName =
  'pets' | 'profiles' | 'shelters' | 'users' | 'chat' | 'donations' | 'didit';
type EndpointCase = {
  verb: Verb;
  url: string;
  service: ServiceName;
  method: string;
  args: unknown[];
  body?: object;
  multipart?: boolean;
  admin?: boolean;
  public?: boolean;
  response?: object;
};

const user = { sub: 'user-1', email: 'user@example.test', role: UserRole.USER };
const admin = { sub: '', email: '', role: UserRole.ADMIN };
const emptyPetFilters = {
  search: undefined,
  species: undefined,
  breed: undefined,
  breedId: undefined,
  gender: undefined,
  size: undefined,
  adoptionStatus: undefined,
  location: undefined,
  minAgeYears: NaN,
  maxAgeYears: NaN,
  goodWithChildren: undefined,
  goodWithDogs: undefined,
  goodWithCats: undefined,
  vaccinated: undefined,
  neutered: undefined,
  houseTrained: undefined,
  latitude: NaN,
  longitude: NaN,
  radiusKm: NaN,
  sortByDistance: undefined,
};

const cases: EndpointCase[] = [
  {
    verb: 'get',
    url: '/landing/pets',
    public: true,
    service: 'pets',
    method: 'findFeatured',
    args: [],
  },
  {
    verb: 'get',
    url: '/pets?page=2&limit=5&species=Dog',
    service: 'pets',
    method: 'findAll',
    args: [2, 5, { ...emptyPetFilters, species: 'Dog' }],
  },
  {
    verb: 'get',
    url: '/pets/breeds?search=lab&species=Dog&limit=5&locale=hu',
    service: 'pets',
    method: 'findBreeds',
    args: ['lab', 'Dog', 5, 'hu'],
  },
  {
    verb: 'get',
    url: '/pets/species?search=dog&limit=3&locale=en',
    service: 'pets',
    method: 'findSpecies',
    args: ['dog', 3, 'en'],
  },
  {
    verb: 'get',
    url: '/pets/locations?query=Budapest',
    service: 'pets',
    method: 'searchLocations',
    args: ['Budapest'],
  },
  {
    verb: 'get',
    url: '/pets/mine/listings',
    service: 'pets',
    method: 'findByOwner',
    args: ['user-1'],
  },
  {
    verb: 'get',
    url: '/pets/mine/favorites',
    service: 'pets',
    method: 'findFavorites',
    args: ['user-1'],
  },
  {
    verb: 'post',
    url: '/pets/pet-1/favorite',
    service: 'pets',
    method: 'addFavorite',
    args: ['pet-1', 'user-1'],
  },
  {
    verb: 'delete',
    url: '/pets/pet-1/favorite',
    service: 'pets',
    method: 'removeFavorite',
    args: ['pet-1', 'user-1'],
  },
  {
    verb: 'get',
    url: '/pets/pet-1',
    service: 'pets',
    method: 'findById',
    args: ['pet-1'],
  },
  {
    verb: 'post',
    url: '/pets',
    service: 'pets',
    method: 'create',
    multipart: true,
    body: { name: 'Milo' },
    args: [{ name: 'Milo' }, 'user-1', [], user],
  },
  {
    verb: 'patch',
    url: '/pets/pet-1',
    service: 'pets',
    method: 'update',
    multipart: true,
    body: { name: 'Milo' },
    args: ['pet-1', { name: 'Milo' }, [], user],
  },
  {
    verb: 'delete',
    url: '/pets/pet-1',
    service: 'pets',
    method: 'remove',
    args: ['pet-1', user],
  },

  { verb: 'get', url: '/users', service: 'users', method: 'findAll', args: [] },
  {
    verb: 'get',
    url: '/users/user-2',
    service: 'users',
    method: 'findById',
    args: ['user-2'],
  },
  {
    verb: 'post',
    url: '/users',
    service: 'users',
    method: 'create',
    body: { firstName: 'Ada' },
    args: [{ firstName: 'Ada' }],
  },
  {
    verb: 'patch',
    url: '/users/user-2',
    service: 'users',
    method: 'update',
    body: { firstName: 'Ada' },
    args: ['user-2', { firstName: 'Ada' }],
  },
  {
    verb: 'delete',
    url: '/users/user-2',
    service: 'users',
    method: 'remove',
    args: ['user-2'],
  },

  {
    verb: 'get',
    url: '/shelters/me/application',
    service: 'shelters',
    method: 'getMyApplication',
    args: ['user-1'],
  },
  {
    verb: 'post',
    url: '/shelters/me/application',
    service: 'shelters',
    method: 'submitApplication',
    body: { name: 'Shelter' },
    args: ['user-1', { name: 'Shelter' }, []],
  },
  {
    verb: 'get',
    url: '/shelters',
    service: 'shelters',
    method: 'findAll',
    args: [],
  },
  {
    verb: 'get',
    url: '/shelters/shelter-1',
    service: 'shelters',
    method: 'findById',
    args: ['shelter-1'],
  },
  {
    verb: 'post',
    url: '/shelters',
    service: 'shelters',
    method: 'create',
    body: { name: 'Shelter' },
    args: [{ name: 'Shelter' }],
  },
  {
    verb: 'patch',
    url: '/shelters/shelter-1',
    service: 'shelters',
    method: 'update',
    body: { name: 'Shelter' },
    args: ['shelter-1', { name: 'Shelter' }],
  },
  {
    verb: 'delete',
    url: '/shelters/shelter-1',
    service: 'shelters',
    method: 'remove',
    args: ['shelter-1'],
  },

  {
    verb: 'get',
    url: '/profiles/users/user-2',
    service: 'profiles',
    method: 'getUserProfile',
    args: ['user-2'],
  },
  {
    verb: 'get',
    url: '/profiles/shelters/shelter-1',
    service: 'profiles',
    method: 'getShelterProfile',
    args: ['shelter-1'],
  },
  {
    verb: 'get',
    url: '/profiles/users/user-2/comments',
    service: 'profiles',
    method: 'listComments',
    args: ['users', 'user-2'],
  },
  {
    verb: 'post',
    url: '/profiles/users/user-2/comments',
    service: 'profiles',
    method: 'createComment',
    body: { content: 'Hello', parentId: 'parent-1' },
    args: ['users', 'user-2', 'user-1', 'Hello', 'parent-1'],
  },
  {
    verb: 'post',
    url: '/profiles/comments/comment-1/dispute',
    service: 'profiles',
    method: 'disputeComment',
    body: { reason: 'Reason' },
    args: ['comment-1', 'user-1', 'Reason'],
  },

  {
    verb: 'get',
    url: '/chat/threads',
    service: 'chat',
    method: 'listThreads',
    args: ['user-1'],
  },
  {
    verb: 'get',
    url: '/chat/pets/pet-1/thread',
    service: 'chat',
    method: 'getThreadForPet',
    args: ['user-1', 'pet-1'],
  },
  {
    verb: 'get',
    url: '/chat/threads/thread-1',
    service: 'chat',
    method: 'getThreadConversation',
    args: ['user-1', 'thread-1'],
  },
  {
    verb: 'get',
    url: '/chat/threads/thread-1/messages',
    service: 'chat',
    method: 'getMessages',
    args: ['thread-1', 'user-1'],
  },
  {
    verb: 'post',
    url: '/chat/threads/thread-1/read',
    service: 'chat',
    method: 'markThreadRead',
    args: ['thread-1', 'user-1'],
  },
  {
    verb: 'get',
    url: '/chat/push-config',
    service: 'chat',
    method: 'getPushConfiguration',
    args: [],
  },
  {
    verb: 'post',
    url: '/chat/push-subscriptions',
    service: 'chat',
    method: 'savePushSubscription',
    body: {
      endpoint: 'https://example.test',
      keys: { p256dh: 'key', auth: 'secret' },
    },
    args: ['user-1', 'https://example.test', 'key', 'secret'],
  },
  {
    verb: 'delete',
    url: '/chat/push-subscriptions',
    service: 'chat',
    method: 'removePushSubscription',
    body: { endpoint: 'https://example.test' },
    args: ['user-1', 'https://example.test'],
  },
  {
    verb: 'post',
    url: '/chat/devices',
    service: 'chat',
    method: 'registerDevice',
    body: { id: 'device-1', publicKey: 'key' },
    args: ['user-1', 'device-1', 'key'],
  },
  {
    verb: 'get',
    url: '/chat/threads/thread-1/devices',
    service: 'chat',
    method: 'getThreadDevices',
    args: ['thread-1', 'user-1'],
  },
  {
    verb: 'get',
    url: '/chat/key-backup',
    service: 'chat',
    method: 'getKeyBackup',
    args: ['user-1'],
    response: { backup: { ok: true } },
  },
  {
    verb: 'post',
    url: '/chat/key-backup',
    service: 'chat',
    method: 'saveKeyBackup',
    body: { ciphertext: 'data', nonce: 'nonce', salt: 'salt' },
    args: ['user-1', 'data', 'nonce', 'salt'],
  },
  {
    verb: 'post',
    url: '/chat/support',
    service: 'chat',
    method: 'answerSupportQuestion',
    body: { question: 'Help', language: 'hu' },
    args: ['Help', 'hu'],
  },
  {
    verb: 'post',
    url: '/support/questions',
    public: true,
    service: 'chat',
    method: 'answerSupportQuestion',
    body: { question: 'Help' },
    args: ['Help', 'en'],
  },

  {
    verb: 'post',
    url: '/donations/shelters/shelter-1/checkout',
    service: 'donations',
    method: 'createCheckout',
    body: { amount: 1000 },
    args: ['user-1', 'shelter-1', { amount: 1000 }],
  },
  {
    verb: 'get',
    url: '/donations/shelter/status',
    service: 'donations',
    method: 'getStatus',
    args: ['user-1'],
  },
  {
    verb: 'post',
    url: '/donations/shelter/onboarding',
    service: 'donations',
    method: 'startOnboarding',
    args: ['user-1'],
  },
  {
    verb: 'post',
    url: '/donations/shelter/dashboard',
    service: 'donations',
    method: 'createDashboardLink',
    args: ['user-1'],
  },
  {
    verb: 'get',
    url: '/donations/shelter/received',
    service: 'donations',
    method: 'listReceived',
    args: ['user-1'],
  },

  {
    verb: 'get',
    url: '/admin/shelters',
    admin: true,
    service: 'shelters',
    method: 'findAll',
    args: [],
  },
  {
    verb: 'patch',
    url: '/admin/shelters/shelter-1/review',
    admin: true,
    service: 'shelters',
    method: 'reviewApplication',
    body: { status: 'APPROVED', reviewNote: 'OK' },
    args: ['shelter-1', 'APPROVED', 'admin-1', 'OK'],
  },
  {
    verb: 'get',
    url: '/admin/pets?page=2&limit=5&search=Milo',
    admin: true,
    service: 'pets',
    method: 'findAll',
    args: [2, 5, { search: 'Milo' }],
  },
  {
    verb: 'get',
    url: '/admin/users?search=Ada',
    admin: true,
    service: 'users',
    method: 'findAll',
    args: ['Ada'],
  },
  {
    verb: 'patch',
    url: '/admin/users/user-2/status',
    admin: true,
    service: 'users',
    method: 'setActiveStatus',
    body: { isActive: false, reason: 'Reason' },
    args: ['user-2', false, 'Reason'],
  },
  {
    verb: 'get',
    url: '/admin/profile-comments/disputes',
    admin: true,
    service: 'profiles',
    method: 'listDisputedComments',
    args: [],
  },
  {
    verb: 'delete',
    url: '/admin/profile-comments/comment-1',
    admin: true,
    service: 'profiles',
    method: 'removeComment',
    args: ['comment-1', 'admin-1'],
  },
  {
    verb: 'patch',
    url: '/admin/pets/pet-1',
    admin: true,
    service: 'pets',
    method: 'update',
    body: { name: 'Milo' },
    args: ['pet-1', { name: 'Milo' }, [], admin],
  },
  {
    verb: 'delete',
    url: '/admin/pets/pet-1',
    admin: true,
    service: 'pets',
    method: 'remove',
    args: ['pet-1', admin],
  },
];

function mockService(): Record<string, jest.Mock> {
  return new Proxy<Record<string, jest.Mock>>(
    {},
    {
      get(target, key: string) {
        if (key === 'then') return undefined;
        if (!target[key])
          target[key] = jest.fn().mockResolvedValue({ ok: true });
        return target[key];
      },
    },
  );
}

describe('HTTP endpoint contracts', () => {
  let app: INestApplication;
  const httpServer = (): Server => {
    const server: unknown = app.getHttpServer();
    if (!(server instanceof Server)) throw new Error('Expected HTTP server');
    return server;
  };
  const services = {
    pets: mockService(),
    profiles: mockService(),
    shelters: mockService(),
    users: mockService(),
    chat: mockService(),
    donations: mockService(),
    didit: mockService(),
  };
  const prisma = { user: { findUnique: jest.fn() } };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AdminController,
        ChatController,
        PublicSupportController,
        DonationsController,
        StripeWebhookController,
        LandingPetsController,
        PetsController,
        ProfilesController,
        SheltersController,
        UsersController,
        DiditWebhookController,
      ],
      providers: [
        { provide: PetsService, useValue: services.pets },
        { provide: ProfilesService, useValue: services.profiles },
        { provide: SheltersService, useValue: services.shelters },
        { provide: UsersService, useValue: services.users },
        { provide: ChatService, useValue: services.chat },
        { provide: DonationsService, useValue: services.donations },
        { provide: DiditWebhookService, useValue: services.didit },
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            verify: (token: string) => {
              if (token === 'user-token') return user;
              if (token === 'admin-token')
                return { ...user, sub: 'admin-1', role: UserRole.ADMIN };
              throw new Error('Invalid token');
            },
          },
        },
        JwtAuthGuard,
        IdentityVerificationGuard,
        AdminGuard,
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      identityVerificationStatus: IdentityVerificationStatus.APPROVED,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(cases)(
    '$verb $url forwards request data and returns its result',
    async (testCase) => {
      let call = request(httpServer())[testCase.verb](`/api${testCase.url}`);
      if (!testCase.public)
        call = call.set(
          'Authorization',
          `Bearer ${testCase.admin ? 'admin-token' : 'user-token'}`,
        );
      if (testCase.body && testCase.multipart) {
        for (const [key, value] of Object.entries(testCase.body)) {
          if (typeof value !== 'string')
            throw new Error('Expected a string form field');
          call = call.field(key, value);
        }
      } else if (testCase.body) {
        call = call.send(testCase.body);
      }
      const response = await call.expect(testCase.verb === 'post' ? 201 : 200);
      expect(response.body).toEqual(testCase.response ?? { ok: true });
      expect(services[testCase.service][testCase.method]).toHaveBeenCalledWith(
        ...testCase.args,
      );
    },
  );

  it.each(cases.filter((testCase) => !testCase.public))(
    '$verb $url rejects requests without credentials',
    async (testCase) => {
      await request(httpServer())
        [testCase.verb](`/api${testCase.url}`)
        .expect(401);
      expect(
        services[testCase.service][testCase.method],
      ).not.toHaveBeenCalled();
    },
  );

  it.each(cases.filter((testCase) => testCase.admin))(
    '$verb $url rejects non-administrators',
    async (testCase) => {
      await request(httpServer())
        [testCase.verb](`/api${testCase.url}`)
        .set('Authorization', 'Bearer user-token')
        .expect(403);
      expect(
        services[testCase.service][testCase.method],
      ).not.toHaveBeenCalled();
    },
  );

  it('passes uploaded pet photos to the service', async () => {
    await request(httpServer())
      .post('/api/pets')
      .set('Authorization', 'Bearer user-token')
      .field('name', 'Milo')
      .attach('photos', Buffer.from('photo'), {
        filename: 'milo.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(services.pets.create).toHaveBeenCalledWith(
      { name: 'Milo' },
      'user-1',
      [
        expect.objectContaining({
          originalname: 'milo.png',
          mimetype: 'image/png',
          buffer: Buffer.from('photo'),
        }),
      ],
      user,
    );
  });

  it('propagates service errors as HTTP errors', async () => {
    services.pets.findById.mockRejectedValueOnce(
      new NotFoundException('Pet not found'),
    );
    const response = await request(httpServer())
      .get('/api/pets/missing')
      .set('Authorization', 'Bearer user-token')
      .expect(404);
    expect(response.body).toEqual(
      expect.objectContaining({ message: 'Pet not found' }),
    );
  });

  it('rejects unauthenticated, unverified, and non-admin requests', async () => {
    await request(httpServer()).get('/api/pets').expect(401);
    await request(httpServer())
      .get('/api/admin/users')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      identityVerificationStatus: IdentityVerificationStatus.IN_REVIEW,
    });
    await request(httpServer())
      .get('/api/pets')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    expect(services.pets.findAll).not.toHaveBeenCalled();
    expect(services.users.findAll).not.toHaveBeenCalled();
  });

  it('passes raw Stripe webhook payload and signature to the service', async () => {
    const body = '{"id":"evt_1"}';
    await request(httpServer())
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig')
      .send(body)
      .expect(201);
    expect(services.donations.handleWebhook).toHaveBeenCalledWith(
      Buffer.from(body),
      'sig',
    );
  });

  it('passes raw Didit webhook payload and both signatures to the service', async () => {
    const body = '{"status":"approved"}';
    await request(httpServer())
      .post('/api/webhooks/didit')
      .set('Content-Type', 'application/json')
      .set('x-signature', 'old')
      .set('x-signature-v2', 'new')
      .send(body)
      .expect(201);
    expect(services.didit.process).toHaveBeenCalledWith({
      rawBody: Buffer.from(body),
      payload: { status: 'approved' },
      signature: 'old',
      signatureV2: 'new',
    });
  });

  it('streams shelter documents with a sanitized filename', async () => {
    services.shelters.getDocumentForAdmin.mockResolvedValueOnce({
      filePath: __filename,
      mimeType: 'text/plain',
      fileName: 'unsafe name.txt',
    });
    await request(httpServer())
      .get('/api/admin/shelter-documents/doc-1')
      .set('Authorization', 'Bearer admin-token')
      .expect(200)
      .expect('Content-Disposition', 'inline; filename="unsafe_name.txt"');
    expect(services.shelters.getDocumentForAdmin).toHaveBeenCalledWith('doc-1');
  });

  it('protects shelter documents from unauthenticated and non-admin users', async () => {
    await request(httpServer())
      .get('/api/admin/shelter-documents/doc-1')
      .expect(401);
    await request(httpServer())
      .get('/api/admin/shelter-documents/doc-1')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
    expect(services.shelters.getDocumentForAdmin).not.toHaveBeenCalled();
  });

  it('rate limits public support questions', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    try {
      for (let index = 0; index < 12; index++) {
        await request(httpServer())
          .post('/api/support/questions')
          .send({ question: 'Help' })
          .expect(201);
      }
      await request(httpServer())
        .post('/api/support/questions')
        .send({ question: 'Help' })
        .expect(429);
      expect(services.chat.answerSupportQuestion).toHaveBeenCalledTimes(12);
    } finally {
      clock.mockRestore();
    }
  });
});
