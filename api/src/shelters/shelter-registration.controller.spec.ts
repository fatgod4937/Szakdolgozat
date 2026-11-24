import { BadRequestException, INestApplication } from '@nestjs/common';
import { Server } from 'net';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { ShelterRegistrationController } from './shelter-registration.controller';
import { SheltersService } from './shelters.service';

describe('shelter registration HTTP endpoint', () => {
  let app: INestApplication;
  const httpServer = (): Server => {
    const server: unknown = app.getHttpServer();
    if (!(server instanceof Server)) throw new Error('Expected HTTP server');
    return server;
  };
  const auth = { registerAccount: jest.fn() };
  const shelters = {
    assertValidDocuments: jest.fn(),
    assertApplicationDetails: jest.fn(),
    submitApplication: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ShelterRegistrationController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: SheltersService, useValue: shelters },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    auth.registerAccount.mockResolvedValue({
      userId: 'user-1',
      message: 'Created',
    });
    shelters.submitApplication.mockResolvedValue({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates uploaded documents before registering and submitting the application', async () => {
    const response = await request(httpServer())
      .post('/api/shelter-registrations')
      .set('Accept-Language', 'hu')
      .field('email', 'shelter@example.test')
      .field('firstName', 'Ada')
      .field('lastName', 'Example')
      .field('name', 'Shelter')
      .field('acceptDataSafety', 'true')
      .attach('documents', Buffer.from('document'), {
        filename: 'proof.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(response.body).toEqual({ message: 'Created' });
    expect(shelters.assertValidDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        originalname: 'proof.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('document'),
      }),
    ]);
    expect(auth.registerAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'shelter@example.test',
        accountType: 'shelter',
        acceptDataSafety: true,
      }),
      'hu',
    );
    expect(
      shelters.assertValidDocuments.mock.invocationCallOrder[0],
    ).toBeLessThan(auth.registerAccount.mock.invocationCallOrder[0]);
    expect(
      shelters.assertApplicationDetails.mock.invocationCallOrder[0],
    ).toBeLessThan(auth.registerAccount.mock.invocationCallOrder[0]);
    expect(shelters.submitApplication).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'Shelter' }),
      [expect.objectContaining({ originalname: 'proof.pdf' })],
    );
  });

  it('rejects incomplete account details before creating an account', async () => {
    await request(httpServer())
      .post('/api/shelter-registrations')
      .send({ email: 'shelter@example.test' })
      .expect(400);
    expect(auth.registerAccount).not.toHaveBeenCalled();
  });

  it('rejects invalid documents before creating an account', async () => {
    shelters.assertValidDocuments.mockImplementation(() => {
      throw new BadRequestException('Invalid documents');
    });
    await request(httpServer())
      .post('/api/shelter-registrations')
      .send({
        email: 'shelter@example.test',
        firstName: 'Ada',
        lastName: 'Example',
      })
      .expect(400);
    expect(auth.registerAccount).not.toHaveBeenCalled();
    expect(shelters.submitApplication).not.toHaveBeenCalled();
  });
});
