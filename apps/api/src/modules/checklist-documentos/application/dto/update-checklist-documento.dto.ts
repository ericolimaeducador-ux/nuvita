import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StatusChecklistDocumento } from '../../domain/checklist-documento.entity';

export class UpdateChecklistDocumentoDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) nome?: string;
  @IsOptional() @IsEnum(StatusChecklistDocumento) status?: StatusChecklistDocumento;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
  @IsOptional() @IsString() clinicaId?: string;
}
