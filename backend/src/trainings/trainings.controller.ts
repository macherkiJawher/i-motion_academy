import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { TrainingsService } from './trainings.service';

@ApiTags('trainings')
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get()
  findAll() {
    return this.trainingsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  findAllForAdmin() {
    return this.trainingsService.findAllForAdmin();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.trainingsService.findPublicOne(idOrSlug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(
    @Body() dto: CreateTrainingDto,
    @Req() request: { user?: { userId?: string; role?: Role } },
  ) {
    return this.trainingsService.create(
      dto,
      request.user?.userId,
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':idOrSlug')
  update(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateTrainingDto,
    @Req() request: { user?: { userId?: string; role?: Role } },
  ) {
    return this.trainingsService.update(
      idOrSlug,
      dto,
      request.user?.userId,
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':idOrSlug')
  remove(
    @Param('idOrSlug') idOrSlug: string,
    @Req() request: { user?: { userId?: string; role?: Role } },
  ) {
    return this.trainingsService
      .remove(idOrSlug, request.user?.userId, request.user?.role)
      .then(() => ({ ok: true }));
  }
}
