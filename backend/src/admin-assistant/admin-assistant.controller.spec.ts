import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Server } from 'node:http';
import request from 'supertest';
import { AdminAssistantController } from './admin-assistant.controller';
import { AdminAssistantService } from './admin-assistant.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { Role, User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

const JWT_SECRET = 'admin-assistant-test-secret';

describe('AdminAssistantController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const currentUser = {
    id: 'user-admin-1',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    role: Role.ADMIN,
    tokenVersion: 0,
  } as User;

  const adminAssistantService = {
    chat: jest.fn().mockResolvedValue({
      answer: 'Réponse sécurisée',
      language: 'fr',
      dataSources: ['trainings'],
      missingData: [],
    }),
  };

  const usersService = {
    findOne: jest.fn().mockImplementation(() => Promise.resolve(currentUser)),
  };

  const tokenFor = (role: Role, tokenVersion = 0) =>
    jwtService.sign({
      sub: currentUser.id,
      email: currentUser.email,
      role,
      tokenVersion,
    });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET }),
      ],
      controllers: [AdminAssistantController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        { provide: UsersService, useValue: usersService },
        { provide: AdminAssistantService, useValue: adminAssistantService },
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
    usersService.findOne.mockResolvedValue(currentUser);
    adminAssistantService.chat.mockResolvedValue({
      answer: 'Réponse sécurisée',
      language: 'fr',
      dataSources: ['trainings'],
      missingData: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer() as Server)
      .post('/admin/assistant/chat')
      .send({ message: 'test' })
      .expect(401);
  });

  it('rejects non-admin users', async () => {
    currentUser.role = Role.PARTICIPANT;
    await request(app.getHttpServer() as Server)
      .post('/admin/assistant/chat')
      .set('Authorization', `Bearer ${tokenFor(Role.PARTICIPANT)}`)
      .send({ message: 'test' })
      .expect(403);
  });

  it('allows admin users to use the endpoint', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/admin/assistant/chat')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ message: 'Combien de formations sont publiées ?' })
      .expect(201);

    expect(response.body).toMatchObject({
      answer: 'Réponse sécurisée',
      language: 'fr',
    });
    expect(adminAssistantService.chat).toHaveBeenCalledWith({
      message: 'Combien de formations sont publiées ?',
    });
  });

  it('rejects messages that are empty or too long', async () => {
    await request(app.getHttpServer() as Server)
      .post('/admin/assistant/chat')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ message: '' })
      .expect(400);

    const longMessage = 'a'.repeat(2001);
    await request(app.getHttpServer() as Server)
      .post('/admin/assistant/chat')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ message: longMessage })
      .expect(400);
  });
});
