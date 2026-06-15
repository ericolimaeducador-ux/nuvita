import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusLancamento, TipoLancamento } from '../../domain/lancamento.entity';

export class ListLancamentosQueryDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  pacienteId?: string;

  @IsOptional()
  @IsString()
  agendamentoId?: string;

  @IsOptional()
  @IsEnum(TipoLancamento)
  tipo?: TipoLancamento;

  @IsOptional()
  @IsEnum(StatusLancamento)
  status?: StatusLancamento;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
