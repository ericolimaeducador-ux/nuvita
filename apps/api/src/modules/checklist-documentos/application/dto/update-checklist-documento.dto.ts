import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StatusChecklistDocumento } from '../../domain/checklist-documento.entity';

export class UpdateChecklistDocumentoDto {
  @IsOptional() @IsString() @MinLength(2) nome?: string;
  @IsOptional() @IsEnum(StatusChecklistDocumento) status?: StatusChecklistDocumento;
  @IsOptional() @IsString() observacao?: string;
  @IsOptional() @IsString() clinicaId?: string;
}
