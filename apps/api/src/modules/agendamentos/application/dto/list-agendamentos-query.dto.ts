import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ModalidadeAtendimento, StatusAgendamento } from '../../domain/agendamento.entity';

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
  @IsEnum(ModalidadeAtendimento)
  modalidade?: ModalidadeAtendimento;

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
