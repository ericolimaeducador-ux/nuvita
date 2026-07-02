import { IsOptional, IsString } from 'class-validator';

export class CriarChecklistPadraoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
}
