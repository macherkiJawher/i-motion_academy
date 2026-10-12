import { ValidationPipe } from '@nestjs/common';

export class PublicAssistantValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }
}
