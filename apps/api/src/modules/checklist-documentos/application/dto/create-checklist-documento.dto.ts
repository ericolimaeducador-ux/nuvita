import { IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChecklistDocumentoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  @IsString() @MinLength(2) @MaxLength(200) nome!: string;
  @IsOptional() @IsString() @MaxLength(1000) observacao?: string;
}
