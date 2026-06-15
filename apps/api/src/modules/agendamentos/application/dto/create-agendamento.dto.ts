import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ModalidadeAtendimento, TipoAgendamento } from '../../domain/agendamento.entity';

export class CreateAgendamentoDto {
  @IsString()
  clinicaId!: string;

  @IsString()
  pacienteId!: string;

  @IsString()
  medicoId!: string;

  @IsOptional()
  @IsEnum(ModalidadeAtendimento)
  modalidade?: ModalidadeAtendimento;

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
