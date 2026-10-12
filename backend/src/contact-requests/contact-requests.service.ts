import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { UpdateContactRequestDto } from './dto/update-contact-request.dto';
import {
  ContactRequest,
  ContactRequestStatus,
} from './entities/contact-request.entity';

@Injectable()
export class ContactRequestsService {
  constructor(
    @InjectRepository(ContactRequest)
    private readonly contactRequests: Repository<ContactRequest>,
  ) {}

  findAll(): Promise<ContactRequest[]> {
    return this.contactRequests.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateContactRequestDto): Promise<ContactRequest> {
    return this.contactRequests.save(
      this.contactRequests.create({
        ...dto,
        email: dto.email.toLowerCase(),
        phone: dto.phone?.trim() || null,
        status: ContactRequestStatus.NEW,
      }),
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateContactRequestDto,
  ): Promise<ContactRequest> {
    const request = await this.contactRequests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Contact request not found');
    request.status = dto.status;
    return this.contactRequests.save(request);
  }
}
