/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

interface ComplaintUploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role, User } from '../users/entities/user.entity';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintMessageDto } from './dto/create-complaint-message.dto';
import { ReopenComplaintDto } from './dto/reopen-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import {
  ComplaintPriority,
  ComplaintStatus,
} from './entities/complaint.entity';

@Controller('complaints')
@UseGuards(AuthGuard('jwt'))
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}
  @Post() create(@CurrentUser() user: User, @Body() dto: CreateComplaintDto) {
    return this.complaints.create(user, dto);
  }
  @Get('me') mine(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.complaints.findMine(
      user.id,
      Number(page) || 1,
      Math.min(Number(pageSize) || 20, 100),
    );
  }
  @Get(':id') one(@CurrentUser() user: User, @Param('id') id: string) {
    return this.complaints.findOne(id, user);
  }
  @Post(':id/reopen') requestReopen(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReopenComplaintDto,
  ) {
    return this.complaints.requestReopen(id, user, dto);
  }
  @Post(':id/messages') message(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateComplaintMessageDto,
  ) {
    return this.complaints.addMessage(id, user, dto);
  }
  @Post(':id/attachments')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { files: 3, fileSize: 5 * 1024 * 1024, parts: 10 },
      fileFilter: (_request, file, callback) =>
        callback(
          null,
          ['application/pdf', 'image/jpeg', 'image/png'].includes(
            String(file.mimetype ?? ''),
          ),
        ),
    }),
  )
  attachments(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFiles() files: ComplaintUploadedFile[] = [],
  ) {
    return this.complaints.addAttachments(
      id,
      user,
      files.map((file) => ({
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      })),
    );
  }

  @Get(':id/attachments/:attachmentId')
  async attachment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() response: Response,
  ) {
    const result = await this.complaints.getAttachmentForUser(
      id,
      attachmentId,
      user,
    );
    response.setHeader('Content-Type', result.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.originalName}"`,
    );
    response.send(result.buffer);
  }
}

@Controller('admin/complaints')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}
  @Get() list(
    @Query('status') status?: ComplaintStatus,
    @Query('priority') priority?: ComplaintPriority,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.complaints.findAdmin({
      status,
      priority,
      category,
      search,
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 20, 100),
    });
  }
  @Get('metrics') metrics() {
    return this.complaints.metrics();
  }
  @Patch(':id/take') take(@CurrentUser() admin: User, @Param('id') id: string) {
    return this.complaints.take(id, admin);
  }
  @Post(':id/reopen') reopen(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: ReopenComplaintDto,
  ) {
    return this.complaints.reopenAsAdmin(id, admin, dto);
  }
  @Patch(':id') update(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.complaints.update(id, admin, dto);
  }
}
