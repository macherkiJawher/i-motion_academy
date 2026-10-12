import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import passport from 'passport';
import { configureRequestBodyParsing } from './common/configure-request-body-parsing';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureRequestBodyParsing(app);
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_APP_URL,
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error('Une origine de CORS configurée est invalide.');
      }
      if (parsed.origin !== origin.replace(/\/$/, '')) {
        throw new Error(
          'Les origines CORS doivent contenir uniquement le protocole et l’hôte.',
        );
      }
      return parsed.origin;
    });
  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push(
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    );
  }
  const allowedOrigins = new Set(configuredOrigins);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new Error('Origine non autorisée.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(
    session({
      secret:
        process.env.SESSION_SECRET ??
        process.env.JWT_SECRET ??
        'dev-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('i-Motion Academy API')
    .setDescription('API for the Lovable frontend')
    .setVersion('0.1')
    .addBearerAuth()
    .build();

  try {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  } catch (err) {
    // Swagger integration failed (possible version mismatch). Log and continue.
    // The app remains usable; Swagger can be enabled after resolving @nestjs/swagger version.
    // eslint-disable-next-line no-console
    console.warn('Swagger initialization skipped:', (err as Error).message);
  }
  // Serve static OpenAPI JSON with swagger-ui-express as a fallback and lightweight docs
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const swaggerUi = require('swagger-ui-express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const path = require('path');
    const specPath = path.join(
      __dirname,
      '..',
      'swagger',
      'users-openapi.json',
    );
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      app.use('/api/docs-static', swaggerUi.serve, swaggerUi.setup(spec));
    }
  } catch (err) {
    // ignore errors; already logged above
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
