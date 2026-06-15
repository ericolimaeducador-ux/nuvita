import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { FormaPagamento } from '../../domain/lancamento.entity';

export class ReceiveLancamentoDto {
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsDateString()
  recebidoEm?: string;
}
