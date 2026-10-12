import {
  Body,
  Controller,
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
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { UpdateContactRequestDto } from './dto/update-contact-request.dto';
import { ContactRequestsService } from './contact-requests.service';

@ApiTags('contact-requests')
@Controller('contact-requests')
export class ContactRequestsController {
  constructor(private readonly contactRequests: ContactRequestsService) {}

  @Post()
  create(@Body() dto: CreateContactRequestDto) {
    return this.contactRequests.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.contactRequests.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactRequestDto) {
    return this.contactRequests.updateStatus(id, dto);
  }
}
