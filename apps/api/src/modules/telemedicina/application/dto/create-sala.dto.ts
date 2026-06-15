import { IsOptional, IsString } from 'class-validator';

export class CreateSalaDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsString()
  agendamentoId!: string;

  @IsString()
  pacienteId!: string;
}
