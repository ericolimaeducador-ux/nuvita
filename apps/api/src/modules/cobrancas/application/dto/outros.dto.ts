import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsInt, IsISO8601, IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { FormaPagamentoCobranca } from '../../domain/cobranca.entity';
import { VALOR_MAXIMO_CENTAVOS } from './create-cobranca.dto';

/** Atalho "consulta de avaliação": o valor vem da configuração da clínica, não do cliente. */
export class ConsultaAvaliacaoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  // Se omitido, o vencimento é a data de hoje.
  @IsOptional() @IsISO8601() vencimento?: string;
  @IsOptional() @IsEnum(FormaPagamentoCobranca) formaPagamento?: FormaPagamentoCobranca;
  @IsOptional() @IsInt() @Min(1) @Max(48) parcelas?: number;
}

export enum CanalAviso {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export class EnviarAvisoDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(CanalAviso, { each: true })
  canais!: CanalAviso[];
}

export class PagarCobrancaDto {
  // Quem e quando são do servidor (usuário autenticado e agora); o cliente só pode informar a forma usada.
  @IsOptional() @IsEnum(FormaPagamentoCobranca) formaPagamento?: FormaPagamentoCobranca;
}

export class CancelarCobrancaDto {
  @IsString() @IsNotEmpty() @MaxLength(500) motivo!: string;
}

export class ResumoQueryDto {
  @IsOptional() @IsString() clinicaId?: string;
  // Mês de referência AAAA-MM.
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'mes deve estar no formato AAAA-MM.' }) mes!: string;
}

export class SalvarConfigFinanceiroDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsInt() @Min(0) @Max(VALOR_MAXIMO_CENTAVOS) valorConsultaAvaliacaoCentavos!: number;
}
