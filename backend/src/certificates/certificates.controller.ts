import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.certificatesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: { user: { userId: string } }) {
    return this.certificatesService.findMine(request.user.userId);
  }

  @Get('verify/:number')
  verify(@Param('number') number: string) {
    return this.certificatesService.verify(number);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() request: { user: { userId: string; role?: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.certificatesService.download(
      id,
      request.user.userId,
      request.user.role,
    );
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    return new StreamableFile(file.buffer);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: { user: { userId: string; role?: string } },
  ) {
    return this.certificatesService.findOne(
      id,
      request.user.userId,
      request.user.role,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(
    @Body() dto: CreateCertificateDto,
    @Req() request: { user: { userId: string } },
  ) {
    return this.certificatesService.create(dto, request.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateDto,
    @Req() request: { user: { userId: string } },
  ) {
    return this.certificatesService.update(id, dto, request.user.userId);
  }
}
