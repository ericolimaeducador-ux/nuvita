import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubjetivoDto {
  @IsString()
  queixaPrincipal!: string;

  @IsOptional()
  @IsString()
  hda?: string;

  @IsOptional()
  @IsString()
  antecedentesPessoais?: string;

  @IsOptional()
  @IsString()
  antecedentesCirurgicos?: string;

  @IsOptional()
  @IsString()
  medicamentosEmUso?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  historiaFamiliar?: string;

  @IsOptional()
  @IsString()
  historiaSocial?: string;

  @IsOptional()
  @IsString()
  revisaoSistemas?: string;
}

export class SinaisVitaisDto {
  @IsOptional()
  @IsString()
  pressaoArterial?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  frequenciaCardiaca?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  frequenciaRespiratoria?: number;

  @IsOptional()
  @IsNumber()
  temperatura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  saturacaoO2?: number;

  @IsOptional()
  @IsNumber()
  peso?: number;

  @IsOptional()
  @IsNumber()
  altura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  escalaDor?: number;
}

export class ExameSegmentarDto {
  @IsOptional() @IsString() cabecaPescoco?: string;
  @IsOptional() @IsString() cardiovascular?: string;
  @IsOptional() @IsString() respiratorio?: string;
  @IsOptional() @IsString() abdome?: string;
  @IsOptional() @IsString() geniturinario?: string;
  @IsOptional() @IsString() neurologico?: string;
  @IsOptional() @IsString() extremidades?: string;
  @IsOptional() @IsString() pele?: string;
}

export class ObjetivoDto {
  @IsOptional()
  @IsString()
  estadoGeral?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SinaisVitaisDto)
  sinaisVitais?: SinaisVitaisDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExameSegmentarDto)
  exameSegmentar?: ExameSegmentarDto;

  @IsOptional()
  @IsString()
  exameFisico?: string;
}

export class AvaliacaoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hipotesesDiagnosticas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cid10?: string[];

  @IsOptional()
  @IsString()
  diagnosticoDefinitivo?: string;

  @IsOptional()
  @IsString()
  evolucao?: string;
}

export class PlanoDto {
  @IsOptional()
  @IsString()
  conduta?: string;

  @IsOptional()
  @IsString()
  prescricao?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examesSolicitados?: string[];

  @IsOptional()
  @IsString()
  orientacoes?: string;

  @IsOptional()
  @IsString()
  encaminhamentos?: string;

  @IsOptional()
  @IsString()
  retorno?: string;
}

export class ArquivoProntuarioDto {
  @IsString()
  nome!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsString()
  tipo!: string;

  @IsInt()
  @Min(0)
  tamanho!: number;
}

export class ArquivosProntuarioDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}

/** Registro de atendimento psicológico / psicoterapia (Res. CFP 006/2019). */
export class RegistroPsicologicoDto {
  @IsOptional() @IsString() motivoAtendimento?: string;
  @IsOptional() @IsString() avaliacaoDemanda?: string;
  @IsOptional() @IsString() doencasPrevias?: string;
  @IsOptional() @IsString() diagnosticosSaudeMental?: string;
  @IsOptional() @IsString() medicamentosEmUso?: string;
  @IsOptional() @IsString() historicoFamiliarSaudeMental?: string;
  @IsOptional() @IsString() qualidadeSono?: string;
  @IsOptional() @IsString() apetiteAlimentacao?: string;
  @IsOptional() @IsString() atividadeFisica?: string;
  @IsOptional() @IsString() usoSubstancias?: string;
  @IsOptional() @IsString() estadoEmocional?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) escalaDor?: number;
  @IsOptional() @IsString() avaliacaoRisco?: string;
  @IsOptional() @IsString() redeApoio?: string;
  @IsOptional() @IsString() objetivosTrabalho?: string;
  @IsOptional() @IsString() procedimentoTecnica?: string;
  @IsOptional() @IsString() evolucao?: string;
  @IsOptional() @IsString() encaminhamentos?: string;
  @IsOptional() @IsString() anotacoesLivres?: string;
  // O CRP NÃO é campo do registro: o servidor carimba o do perfil (user.crp) ao assinar.

  @IsOptional() @IsString() tccPensamentosAutomaticos?: string;
  @IsOptional() @IsString() tccDistorcoesCognitivas?: string;
  @IsOptional() @IsString() tccTarefaCasa?: string;
  @IsOptional() @IsString() tccRegistroComportamental?: string;
  @IsOptional() @IsString() psicanaliseAssociacaoLivre?: string;
  @IsOptional() @IsString() psicanaliseConteudoOnirico?: string;
  @IsOptional() @IsString() psicanaliseDinamicaTransferencial?: string;
  @IsOptional() @IsString() psicanaliseRepeticoes?: string;
  @IsOptional() @IsString() humanistaCongruencia?: string;
  @IsOptional() @IsString() humanistaAutorrealizacao?: string;
  @IsOptional() @IsString() humanistaAcolhimento?: string;
  @IsOptional() @IsString() gestaltAwareness?: string;
  @IsOptional() @IsString() gestaltFiguraFundo?: string;
  @IsOptional() @IsString() gestaltContatoFronteira?: string;
  @IsOptional() @IsString() junguianaSimbolosArquetipicos?: string;
  @IsOptional() @IsString() junguianaMaterialOnirico?: string;
  @IsOptional() @IsString() junguianaProcessoIndividuacao?: string;
}
