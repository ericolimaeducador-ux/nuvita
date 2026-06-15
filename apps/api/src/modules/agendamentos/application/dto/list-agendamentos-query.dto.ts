import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusAgendamento } from '../../domain/agendamento.entity';

export class ListAgendamentosQueryDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  medicoId?: string;

  @IsOptional()
  @IsString()
  pacienteId?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsEnum(StatusAgendamento)
  status?: StatusAgendamento;
}
