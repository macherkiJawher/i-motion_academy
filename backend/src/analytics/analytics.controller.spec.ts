import { Test } from '@nestjs/testing';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController authorization', () => {
  let app: INestApplication;
  let role = Role.ADMIN;
  const getAdminAnalytics = jest.fn().mockResolvedValue({});

  beforeAll(async () => {
    const jwtGuard: CanActivate = {
      canActivate(context: ExecutionContext) {
        const request = context
          .switchToHttp()
          .getRequest<{ user?: { userId: string; role: Role } }>();
        request.user = {
          userId: 'user-1',
          role,
        };
        return true;
      },
    };
    const module = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        RolesGuard,
        {
          provide: AnalyticsService,
          useValue: { getAdminAnalytics },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows an administrator to access analytics', async () => {
    role = Role.ADMIN;

    await request(app.getHttpServer() as Server)
      .get('/analytics')
      .expect(200);
  });

  it('passes query filters through to the analytics service', async () => {
    role = Role.ADMIN;
    const filters = {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      trainingId: '11111111-1111-4111-8111-111111111111',
    };

    await request(app.getHttpServer() as Server)
      .get(
        `/analytics?startDate=${filters.startDate}&endDate=${filters.endDate}&trainingId=${filters.trainingId}`,
      )
      .expect(200);

    expect(getAdminAnalytics).toHaveBeenCalledWith(filters);
  });

  it('rejects an authenticated participant with 403', async () => {
    role = Role.PARTICIPANT;

    await request(app.getHttpServer() as Server)
      .get('/analytics')
      .expect(403);
  });
});
