import { IsIn, IsInt, IsISO8601, IsMongoId, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import {
  ETIOLOGIAS_LESAO,
  EtiologiaLesao,
  LADOS_LESAO,
  LOCALIZACAO_MAX,
  LadoLesao,
  SUBTIPOS_LESAO_UMIDADE,
  SubtipoLesaoUmidade,
} from '../../../../../../../packages/shared/src/consulta';

// As regras condicionais (subtipo só em umidade, texto só em OUTRA) ficam no validador compartilhado
// (validarIdentificacaoLesao), aplicado pelo serviço — a web usa o mesmo.
export class IdentificacaoLesaoDto {
  @IsString() @MaxLength(LOCALIZACAO_MAX) localizacaoAnatomica!: string;
  @IsIn(LADOS_LESAO) lado!: LadoLesao;
  @IsIn(ETIOLOGIAS_LESAO) etiologia!: EtiologiaLesao;
  @IsOptional() @IsIn(SUBTIPOS_LESAO_UMIDADE) subtipoUmidade?: SubtipoLesaoUmidade;
  @IsOptional() @IsString() @MaxLength(LOCALIZACAO_MAX) etiologiaOutra?: string;
}

export class CreateLesaoDto extends IdentificacaoLesaoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataIdentificacao deve ser AAAA-MM-DD' }) dataIdentificacao!: string;
}

/** Correção de etiologia/localização: versionada (histórico com autor, data, motivo e valores anteriores). */
export class CorrigirLesaoDto extends IdentificacaoLesaoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() @MinLength(10, { message: 'Explique o motivo da correção (mínimo de 10 caracteres).' }) @MaxLength(1000) motivo!: string;
  /** Versão que o enfermeiro estava vendo (controle otimista: outra correção no meio -> 409). */
  @IsInt() @Min(1) versao!: number;
}

export class PacienteQueryDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
}

export class RegistrarConsentimentoImagemDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  /** Quando o consentimento foi obtido (não pode ser no futuro). */
  @IsISO8601({ strict: true }) obtidoEm!: string;
}
