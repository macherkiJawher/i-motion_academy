import { Controller, Module, Post, Body } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { configureRequestBodyParsing } from './configure-request-body-parsing';

@Controller()
class BodyEchoController {
  @Post('assistant/public/chat')
  assistant(@Body() body: unknown) {
    return body;
  }

  @Post('contact')
  contact(@Body() body: unknown) {
    return body;
  }
}

@Module({ controllers: [BodyEchoController] })
class BodyEchoModule {}

describe('configureRequestBodyParsing', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [BodyEchoModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureRequestBodyParsing(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects assistant JSON over 12 KB during parsing', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/assistant/public/chat')
      .send({ message: 'x'.repeat(13_000) });

    expect(response.status).toBe(413);
  });

  it('preserves the existing 100 KB JSON limit for other routes', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/contact')
      .send({ message: 'x'.repeat(13_000) });

    expect(response.status).toBe(201);
    const body = response.body as { message: string };
    expect(body.message).toHaveLength(13_000);
  });

  it('returns a generic client error for malformed JSON without exposing parser internals', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/assistant/public/chat')
      .set('Content-Type', 'application/json')
      .send('{"message":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Invalid JSON request body',
      error: 'Bad Request',
    });
  });
});
