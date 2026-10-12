import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Get()
  findAll() {
    return this.trainers.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  findAllForAdmin() {
    return this.trainers.findAllForAdmin();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:idOrSlug')
  findOneForAdmin(@Param('idOrSlug') idOrSlug: string) {
    return this.trainers.findOne(idOrSlug);
  }

  @Get(':idOrSlug/sessions')
  findSessions(@Param('idOrSlug') idOrSlug: string) {
    return this.trainers.findSessions(idOrSlug);
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.trainers.findPublicOne(idOrSlug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTrainerDto) {
    return this.trainers.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':idOrSlug')
  update(@Param('idOrSlug') idOrSlug: string, @Body() dto: UpdateTrainerDto) {
    return this.trainers.update(idOrSlug, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':idOrSlug')
  archive(@Param('idOrSlug') idOrSlug: string) {
    return this.trainers.archive(idOrSlug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':idOrSlug/restore')
  restore(@Param('idOrSlug') idOrSlug: string) {
    return this.trainers.restore(idOrSlug);
  }
}
