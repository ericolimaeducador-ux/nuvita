import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CriarChecklistPadraoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
}
