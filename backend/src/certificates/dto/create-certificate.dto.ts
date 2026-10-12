import { IsEnum, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { CertificateType } from '../entities/certificate.entity';

export class CreateCertificateDto {
  @IsUUID()
  registrationId: string;

  @IsEnum(CertificateType)
  type: CertificateType;

  @IsOptional()
  @IsString()
  @IsUrl()
  fileUrl?: string | null;
}
