import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateOwnRegistrationDto } from './dto/update-own-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.registrationsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(
    @Req() request: { user?: { userId?: string }; query?: { userId?: string } },
    @Query('userId') userId?: string,
  ) {
    const effectiveUserId =
      request?.user?.userId ?? userId ?? request?.query?.userId ?? null;
    return this.registrationsService.findMine(effectiveUserId ?? '');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('session/:sessionId')
  findBySession(
    @Param('sessionId') sessionId: string,
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.registrationsService.findBySession(
      sessionId,
      request.user?.userId ?? '',
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.registrationsService.findOneForActor(
      id,
      request.user?.userId ?? '',
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreateRegistrationDto,
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.registrationsService.create(
      dto,
      request.user?.userId,
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/documents')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'registrations');
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_request, file, callback) => {
          callback(
            null,
            `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          );
        },
      }),
      limits: { files: 2, fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          null,
          [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ].includes(file.mimetype),
        ),
    }),
  )
  uploadDocuments(
    @Param('id') id: string,
    @UploadedFiles() files: any[],
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.registrationsService.attachDocuments(
      id,
      files ?? [],
      request.user?.userId,
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/documents/:kind')
  async document(
    @Param('id') id: string,
    @Param('kind') kind: 'identity' | 'qualification',
    @Req() request: { user?: { userId?: string; role?: string } },
    @Res() response: Response,
  ) {
    return response.sendFile(
      await this.registrationsService.getDocument(
        id,
        kind,
        request.user?.userId,
        request.user?.role,
      ),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/me')
  updateOwnDetails(
    @Param('id') id: string,
    @Body() dto: UpdateOwnRegistrationDto,
    @Req() request: { user?: { userId?: string } },
  ) {
    return this.registrationsService.updateOwnDetails(
      id,
      request.user?.userId ?? '',
      dto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRegistrationDto,
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.registrationsService.update(
      id,
      dto,
      request.user?.userId,
      request.user?.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registrationsService.remove(id).then(() => ({ ok: true }));
  }
}
