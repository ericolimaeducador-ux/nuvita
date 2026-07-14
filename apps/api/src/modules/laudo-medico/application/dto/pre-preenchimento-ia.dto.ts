import { IsOptional, IsString } from 'class-validator';

export class PrePreenchimentoIaDto {
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsOptional() @IsString() clinicaId?: string;
}
