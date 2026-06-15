import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { FormaPagamento, TipoLancamento } from '../../domain/lancamento.entity';

export class CreateLancamentoDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  pacienteId?: string;

  @IsOptional()
  @IsString()
  agendamentoId?: string;

  @IsEnum(TipoLancamento)
  tipo!: TipoLancamento;

  @IsString()
  @MinLength(3)
  descricao!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor!: number;

  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsDateString()
  vencimento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
