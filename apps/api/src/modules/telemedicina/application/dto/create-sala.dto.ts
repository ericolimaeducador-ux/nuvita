import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ModalidadeAtendimento } from '../../domain/sala-telemedicina.entity';

export class CreateSalaDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsString()
  agendamentoId!: string;

  @IsString()
  pacienteId!: string;

  @IsOptional()
  @IsEnum(ModalidadeAtendimento)
  modalidade?: ModalidadeAtendimento;
}
