import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Server } from 'node:http';
import request from 'supertest';
import { PaymentsController } from '../payments/payments.controller';
import { PaymentsService } from '../payments/payments.service';
import { Role, User } from '../users/entities/user.entity';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

const JWT_SECRET = 'authorization-test-secret';

describe('Backend authorization', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const currentUser = {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'user@example.com',
    role: Role.ADMIN,
    tokenVersion: 0,
  } as User;
  const usersService = {
    findAll: jest.fn().mockResolvedValue([currentUser]),
    findOne: jest.fn().mockImplementation(() => Promise.resolve(currentUser)),
    updateProfile: jest.fn(),
  };
  const paymentsService = {
    findAll: jest.fn().mockResolvedValue([]),
    findMine: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockImplementation((id, userId, role) =>
      Promise.resolve({ id, userId, role }),
    ),
    getReceiptPdf: jest.fn(),
    create: jest.fn(),
  };

  const tokenFor = (role: Role, tokenVersion = 0) =>
    jwtService.sign({
      sub: currentUser.id,
      email: currentUser.email,
      role,
      tokenVersion,
    });

  const withToken = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET }),
      ],
      controllers: [UsersController, PaymentsController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        { provide: UsersService, useValue: usersService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    jwtService = module.get(JwtService);
  });

  beforeEach(() => {
    currentUser.role = Role.ADMIN;
    currentUser.tokenVersion = 0;
    jest.clearAllMocks();
    usersService.findAll.mockResolvedValue([currentUser]);
    usersService.findOne.mockImplementation(() => Promise.resolve(currentUser));
    paymentsService.findOne.mockImplementation((id, userId, role) =>
      Promise.resolve({ id, userId, role }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous access to user and payment endpoints', async () => {
    await request(app.getHttpServer() as Server).get('/users').expect(401);
    await request(app.getHttpServer() as Server)
      .get('/users/me')
      .expect(401);
    await request(app.getHttpServer() as Server)
      .get('/payments/payment-1')
      .expect(401);
  });

  it('allows an administrator to list users and access an individual user', async () => {
    const headers = withToken(tokenFor(Role.ADMIN));

    await request(app.getHttpServer() as Server)
      .get('/users')
      .set(headers)
      .expect(200);
    await request(app.getHttpServer() as Server)
      .get('/users/user-2')
      .set(headers)
      .expect(200);
  });

  it('denies participants access to user lists and other user records', async () => {
    currentUser.role = Role.PARTICIPANT;
    const headers = withToken(tokenFor(Role.PARTICIPANT));

    await request(app.getHttpServer() as Server)
      .get('/users')
      .set(headers)
      .expect(403);
    await request(app.getHttpServer() as Server)
      .get('/users/user-2')
      .set(headers)
      .expect(403);
  });

  it('continues to allow participants to access their own profile', async () => {
    currentUser.role = Role.PARTICIPANT;

    await request(app.getHttpServer() as Server)
      .get('/users/me')
      .set(withToken(tokenFor(Role.PARTICIPANT)))
      .expect(200);
  });

  it('rejects a participant from the admin payment list', async () => {
    currentUser.role = Role.PARTICIPANT;

    await request(app.getHttpServer() as Server)
      .get('/payments')
      .set(withToken(tokenFor(Role.PARTICIPANT)))
      .expect(403);
  });

  it('passes the authenticated payment owner and role to the service', async () => {
    currentUser.role = Role.PARTICIPANT;
    const response = await request(app.getHttpServer() as Server)
      .get('/payments/payment-1')
      .set(withToken(tokenFor(Role.PARTICIPANT)))
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'payment-1',
      userId: currentUser.id,
      role: Role.PARTICIPANT,
    });
    expect(paymentsService.findOne).toHaveBeenCalledWith(
      'payment-1',
      currentUser.id,
      Role.PARTICIPANT,
    );
  });

  it('rejects an old administrator token after role demotion', async () => {
    const staleAdminToken = tokenFor(Role.ADMIN);
    currentUser.role = Role.PARTICIPANT;

    await request(app.getHttpServer() as Server)
      .get('/payments')
      .set(withToken(staleAdminToken))
      .expect(401);
  });

  it('rejects tokens invalidated by a token version change', async () => {
    const staleToken = tokenFor(Role.ADMIN);
    currentUser.tokenVersion = 1;

    await request(app.getHttpServer() as Server)
      .get('/payments')
      .set(withToken(staleToken))
      .expect(401);
  });
});
