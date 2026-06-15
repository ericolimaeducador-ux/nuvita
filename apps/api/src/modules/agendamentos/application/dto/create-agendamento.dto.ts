import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoAgendamento } from '../../domain/agendamento.entity';

export class CreateAgendamentoDto {
  @IsString()
  clinicaId!: string;

  @IsString()
  pacienteId!: string;

  @IsString()
  medicoId!: string;

  @IsDateString()
  dataHoraInicio!: string;

  @IsDateString()
  dataHoraFim!: string;

  @IsEnum(TipoAgendamento)
  tipo!: TipoAgendamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
