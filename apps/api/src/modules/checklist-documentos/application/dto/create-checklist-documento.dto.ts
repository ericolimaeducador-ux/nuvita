import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChecklistDocumentoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() @MinLength(2) nome!: string;
  @IsOptional() @IsString() observacao?: string;
}
