import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  AdminAssistantChatRequestDto,
  AdminAssistantChatResponseDto,
} from './admin-assistant.dto';
import { AdminAssistantService } from './admin-assistant.service';

@Controller('admin/assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAssistantController {
  constructor(private readonly adminAssistantService: AdminAssistantService) {}

  @Post('chat')
  @Roles(Role.ADMIN)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async chat(
    @Body() request: AdminAssistantChatRequestDto,
  ): Promise<AdminAssistantChatResponseDto> {
    return this.adminAssistantService.chat(request);
  }
}
