import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_REQUEST_BYTES = 12_000;
const MAX_TRACKED_CLIENTS = 10_000;

@Injectable()
export class PublicAssistantRateLimitGuard implements CanActivate {
  private readonly clients = new Map<string, RateLimitRecord>();
  private checks = 0;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const bodySize = Buffer.byteLength(
      JSON.stringify(request.body ?? {}),
      'utf8',
    );
    if (bodySize > MAX_REQUEST_BYTES) {
      throw new BadRequestException('Assistant request is too large');
    }

    const now = Date.now();
    const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
    let record = this.clients.get(clientKey);
    if (!record || record.resetAt <= now) {
      this.removeExpiredClients(now);
      if (this.clients.size >= MAX_TRACKED_CLIENTS) {
        response.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
        throw new HttpException(
          'Too many assistant clients. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      record = { count: 0, resetAt: now + WINDOW_MS };
      this.clients.set(clientKey, record);
    }
    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.resetAt - now) / 1000),
      );
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        'Too many assistant requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    record.count += 1;

    this.checks += 1;
    if (this.checks % 100 === 0) {
      this.removeExpiredClients(now);
    }
    return true;
  }

  private removeExpiredClients(now: number): void {
    for (const [key, value] of this.clients) {
      if (value.resetAt <= now) this.clients.delete(key);
    }
  }
}
