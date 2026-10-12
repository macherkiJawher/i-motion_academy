import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/entities/user.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('me')
  findMine(@Req() request: { user: { userId: string } }) {
    return this.paymentsService.findMine(request.user.userId);
  }

  @Get(':id/receipt')
  async downloadReceipt(
    @Param('id') id: string,
    @Req() request: { user?: { userId?: string; role?: string } },
    @Res() response: Response,
  ): Promise<void> {
    const receipt = await this.paymentsService.getReceiptPdf(
      id,
      request.user?.userId,
      request.user?.role,
    );
    response
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recu-${encodeURIComponent(receipt.reference)}.pdf"`,
        'Cache-Control': 'private, no-store',
      })
      .send(receipt.content);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: { user: { userId: string; role: Role } },
  ) {
    return this.paymentsService.findOne(
      id,
      request.user.userId,
      request.user.role,
    );
  }

  @Post()
  create(
    @Body() dto: CreatePaymentDto,
    @Req() request: { user?: { userId?: string; role?: string } },
  ) {
    return this.paymentsService.create(
      dto,
      request.user?.userId,
      request.user?.role,
    );
  }
}
