import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { VALOR_MAXIMO_CENTAVOS } from '../../../cobrancas/application/dto/create-cobranca.dto';
import { AreaModuloAvaliacao, OrigemDiagnostico, PadraoImplementacao } from '../../domain/consulta-enfermagem.entity';

// Textos livres do enfermeiro. Os tetos só evitam payload abusivo.
const TEXTO_LONGO = 20000;
const TEXTO_CURTO = 2000;

export class ModuloAvaliacaoDto {
  @IsEnum(AreaModuloAvaliacao) area!: AreaModuloAvaliacao;
  // Validado pela definição registrada para a área (ModulosAvaliacaoRegistry); nesta etapa nenhuma área está registrada.
  @IsObject() dados!: Record<string, unknown>;
}

export class AvaliacaoDto {
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) dadosSubjetivos?: string;
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) dadosObjetivos?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ModuloAvaliacaoDto)
  modulos?: ModuloAvaliacaoDto[];
}

export class DiagnosticoDto {
  // Texto livre: o sistema não oferece lista nem taxonomia de diagnósticos.
  @IsString() @IsNotEmpty() @MaxLength(TEXTO_CURTO) texto!: string;
  // Nesta etapa só MANUAL é gravável (IA_ACEITA/IA_EDITADA ficam para a 5f).
  @IsIn([OrigemDiagnostico.MANUAL]) origem!: OrigemDiagnostico;
}

export class PlanejamentoDto {
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) prioridades?: string;
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) resultadosEsperados?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(TEXTO_CURTO, { each: true })
  prescricaoEnfermagem?: string[];
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) examesSolicitados?: string;
  @IsOptional() @IsString() @MaxLength(TEXTO_LONGO) encaminhamentos?: string;
}

export class RegistroImplementacaoDto {
  @IsEnum(PadraoImplementacao) padrao!: PadraoImplementacao;
  @IsString() @IsNotEmpty() @MaxLength(TEXTO_LONGO) descricao!: string;
  // Quando foi realizado (omitido = agora). Quem registrou é sempre o autor (servidor).
  @IsOptional() @IsISO8601() registradoEm?: string;
}

export class ImplementacaoDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RegistroImplementacaoDto)
  registros!: RegistroImplementacaoDto[];
}

export class EvolucaoDto {
  @IsString() @MaxLength(TEXTO_LONGO) texto!: string;
}

/** Conteúdo das 5 etapas. Cada seção enviada SUBSTITUI a gravada (rascunho). */
export class ConteudoConsultaDto {
  @IsOptional() @ValidateNested() @Type(() => AvaliacaoDto) avaliacao?: AvaliacaoDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DiagnosticoDto)
  diagnosticos?: DiagnosticoDto[];

  @IsOptional() @ValidateNested() @Type(() => PlanejamentoDto) planejamento?: PlanejamentoDto;
  @IsOptional() @ValidateNested() @Type(() => ImplementacaoDto) implementacao?: ImplementacaoDto;
  @IsOptional() @ValidateNested() @Type(() => EvolucaoDto) evolucao?: EvolucaoDto;
}

export class CreateConsultaDto extends ConteudoConsultaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
}

export class UpdateConsultaDto extends ConteudoConsultaDto {
  @IsOptional() @IsString() clinicaId?: string;
}

export class CobrancaAssinaturaDto {
  // true = já está num pacote: não gera cobrança (fica registrado na consulta e na auditoria).
  @IsBoolean() incluidaEmPacote!: boolean;
  // Em centavos. Omitido = valor padrão da clínica (configuração do financeiro).
  @IsOptional() @IsInt() @Min(0) @Max(VALOR_MAXIMO_CENTAVOS) valorCentavos?: number;
}

export class AssinarConsultaDto {
  @ValidateNested() @Type(() => CobrancaAssinaturaDto) cobranca!: CobrancaAssinaturaDto;
}

export class CreateAdendoConsultaDto {
  @IsString() @MinLength(10, { message: 'Explique o motivo do adendo (mínimo de 10 caracteres).' }) @MaxLength(1000) motivo!: string;
  @IsString() @IsNotEmpty() @MaxLength(TEXTO_LONGO) texto!: string;
}

export const MIME_ANEXO_CONSULTA = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/** Upload de anexo (foto/PDF do diário em papel): só PDF, JPG e PNG, no limite de tamanho do módulo de documentos. */
export class PresignAnexoConsultaDto {
  @IsIn(MIME_ANEXO_CONSULTA) mimeType!: (typeof MIME_ANEXO_CONSULTA)[number];
  @IsInt() @Min(1) tamanho!: number;
  // SHA-256 do arquivo (hex), assinado na URL de upload como no módulo de documentos.
  @Matches(/^[a-f0-9]{64}$/i) hash!: string;
}

export class ListConsultasQueryDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
}
