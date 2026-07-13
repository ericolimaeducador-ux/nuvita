import { IsEnum, IsInt, IsISO8601, IsMongoId, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { FormaPagamento } from '../../domain/lancamento.entity';

export class CobrarCicloDto {
  @IsMongoId()
  pacienteId!: string;

  /** Ciclo de 4 sessões que esta cobrança paga. */
  @IsInt()
  @Min(1)
  ciclo!: number;

  @IsPositive()
  valor!: number;

  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsISO8601()
  vencimento?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  /** Só admin/super-admin: cobra em nome de um psicólogo. */
  @IsOptional()
  @IsMongoId()
  profissionalId?: string;
}
