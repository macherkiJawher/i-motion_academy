import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get('me')
  findMine(@Req() request: { user: { userId: string } }) {
    return this.notificationsService.findMine(request.user.userId);
  }

  @Patch('read-all')
  async markAllRead(@Req() request: { user: { userId: string } }) {
    await this.notificationsService.markAllRead(request.user.userId);
    return { ok: true };
  }

  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @Req() request: { user: { userId: string; role?: string } },
  ) {
    return this.notificationsService.markRead(
      id,
      request.user.userId,
      request.user.role === Role.ADMIN,
    );
  }
}
