import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FormaPagamentoCobranca, TipoCobranca } from '../../domain/cobranca.entity';

export const TIPOS_COBRANCA_MANUAL = Object.values(TipoCobranca).filter((t) => t !== TipoCobranca.CONSULTA_ENFERMAGEM);

// Teto defensivo (R$ 1.000.000,00) contra valor digitado com zeros a mais.
export const VALOR_MAXIMO_CENTAVOS = 100_000_000;

export class ItemCobrancaDto {
  @IsString() @IsNotEmpty() @MaxLength(200) descricao!: string;
  @IsInt() @Min(0) @Max(VALOR_MAXIMO_CENTAVOS) valorCentavos!: number;
}

export class CreateCobrancaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  // consulta_enfermagem só nasce da assinatura da consulta (com vínculo consultaId): não é aceito na criação manual.
  @IsIn(TIPOS_COBRANCA_MANUAL) tipo!: TipoCobranca;
  // Texto livre: o que o pacote/cobrança inclui.
  @IsString() @IsNotEmpty() @MaxLength(500) descricao!: string;

  // Valor em centavos. Pode ser omitido quando `itens` vem: aí o valor é a soma dos itens (e, se vierem os dois,
  // têm que bater — o servidor recusa divergência).
  @IsOptional() @IsInt() @Min(0) @Max(VALOR_MAXIMO_CENTAVOS) valorCentavos?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ItemCobrancaDto)
  itens?: ItemCobrancaDto[];

  @IsOptional() @IsEnum(FormaPagamentoCobranca) formaPagamento?: FormaPagamentoCobranca;
  @IsOptional() @IsInt() @Min(1) @Max(48) parcelas?: number;
  @IsISO8601() vencimento!: string;

  // Vínculo OPCIONAL ao atendimento/plano: referência sem validação dura por ora (atendimento/prontuário: etapa 5).
  @IsOptional() @IsString() @MaxLength(100) atendimentoId?: string;
  @IsOptional() @IsString() @MaxLength(100) planoId?: string;
}
