import { IsEnum } from 'class-validator';
import { ContactRequestStatus } from '../entities/contact-request.entity';

export class UpdateContactRequestDto {
  @IsEnum(ContactRequestStatus)
  status: ContactRequestStatus;
}
