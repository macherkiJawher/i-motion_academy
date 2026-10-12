import type { INestApplication } from '@nestjs/common';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';

const PUBLIC_ASSISTANT_BODY_LIMIT = '12kb';
const DEFAULT_BODY_LIMIT = '100kb';

export function configureRequestBodyParsing(app: INestApplication): void {
  app.use('/assistant/public/chat', parseJson(PUBLIC_ASSISTANT_BODY_LIMIT));
  app.use(parseJson(DEFAULT_BODY_LIMIT));
  app.use(
    express.urlencoded({
      extended: true,
      limit: DEFAULT_BODY_LIMIT,
    }),
  );
}

function parseJson(limit: string): RequestHandler {
  const parser = express.json({ limit });
  return (request: Request, response: Response, next: NextFunction): void => {
    parser(request, response, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }
      const errorType =
        typeof error === 'object' && error !== null && 'type' in error
          ? error.type
          : undefined;
      if (errorType === 'entity.too.large') {
        response.status(413).json({
          statusCode: 413,
          message: 'Request body is too large',
          error: 'Payload Too Large',
        });
        return;
      }
      if (errorType === 'entity.parse.failed') {
        response.status(400).json({
          statusCode: 400,
          message: 'Invalid JSON request body',
          error: 'Bad Request',
        });
        return;
      }
      next(error);
    });
  };
}
