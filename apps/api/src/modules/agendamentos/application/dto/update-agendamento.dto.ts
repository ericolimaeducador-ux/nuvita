import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoAgendamento } from '../../domain/agendamento.entity';

export class UpdateAgendamentoDto {
  @IsOptional()
  @IsString()
  medicoId?: string;

  @IsOptional()
  @IsDateString()
  dataHoraInicio?: string;

  @IsOptional()
  @IsDateString()
  dataHoraFim?: string;

  @IsOptional()
  @IsEnum(TipoAgendamento)
  tipo?: TipoAgendamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
