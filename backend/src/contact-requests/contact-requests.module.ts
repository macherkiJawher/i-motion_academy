import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { ContactRequest } from './entities/contact-request.entity';
import { ContactRequestsController } from './contact-requests.controller';
import { ContactRequestsService } from './contact-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContactRequest])],
  controllers: [ContactRequestsController],
  providers: [ContactRequestsService, RolesGuard],
})
export class ContactRequestsModule {}
