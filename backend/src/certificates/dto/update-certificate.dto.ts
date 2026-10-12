import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { CertificateStatus } from '../entities/certificate.entity';

export class UpdateCertificateDto {
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;

  @IsOptional()
  @IsString()
  @IsUrl()
  fileUrl?: string | null;

  @IsOptional()
  @IsString()
  revocationReason?: string;
}
