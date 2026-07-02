import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NaturezaAtendimento,
  TipoSolicitacaoJudicial,
} from '../../domain/prontuario.entity';

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

export class PrescritorJudicialDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() registro?: string;
  @IsOptional() @IsString() especialidade?: string;
}

export class ProdutoJudicialDto {
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsNumber() calibreFrench?: number;
  @IsOptional() @IsNumber() comprimentoCm?: number;
  @IsOptional() @IsNumber() quantidadePorDia?: number;
  @IsOptional() @IsNumber() quantidadePorMes?: number;
  @IsOptional() @IsBoolean() usoContinuo?: boolean;
}

export class MedicamentoJudicialDto {
  @IsOptional() @IsString() principioAtivo?: string;
  @IsOptional() @IsString() formaFarmaceuticaApresentacao?: string;
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsString() posologia?: string;
  @IsOptional() @IsString() viaAdministracao?: string;
  @IsOptional() @IsString() duracaoTratamento?: string;
}

/** Bloco de judicialização (NAT-JUS). Todos os campos são opcionais. */
export class RelatorioJudicialDto {
  @IsOptional() @IsString() municipioEstado?: string;
  @IsOptional() @IsEnum(NaturezaAtendimento) naturezaAtendimento?: NaturezaAtendimento;
  @IsOptional() @IsString() enfermidadeCid?: string;
  @IsOptional() @IsString() historicoDoenca?: string;
  @IsOptional() @IsString() tratamentosRealizados?: string;
  @IsOptional() @IsEnum(TipoSolicitacaoJudicial) tipoSolicitacao?: TipoSolicitacaoJudicial;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProdutoJudicialDto)
  produto?: ProdutoJudicialDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MedicamentoJudicialDto)
  medicamento?: MedicamentoJudicialDto;

  @IsOptional() @IsString() procedimentoDescricao?: string;
  @IsOptional() @IsBoolean() urgente?: boolean;
  @IsOptional() @IsString() justificativaUrgencia?: string;
  @IsOptional() @IsBoolean() imprescindivel?: boolean;
  @IsOptional() @IsString() justificativaImprescindivel?: string;
  @IsOptional() @IsString() beneficiosEsperados?: string;
  @IsOptional() @IsString() consequenciasNaoUso?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrescritorJudicialDto)
  prescritor?: PrescritorJudicialDto;

  @IsOptional() @IsISO8601() dataEmissao?: string;
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

export class CateterIndicadoDto {
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsNumber() french?: number;
  @IsOptional() @IsNumber() codigo?: number;
}

/**
 * Questionário de Avaliação de Incontinência Urinária, amarrado ao
 * prontuário SOAP. Todos os campos são opcionais — a ficha só é
 * preenchida quando o atendimento envolve avaliação de IU.
 */
export class FichaAvaliacaoIUDto {
  @IsOptional() @IsString() local?: string;
  @IsOptional() @IsString() estadoCivil?: string;
  @IsOptional() @IsString() prescritor?: string;
  @IsOptional() @IsString() planoSaude?: string;
  @IsOptional() @IsString() hospitalReferencia?: string;
  @IsOptional() @IsString() motivoIU?: string;
  @IsOptional() @IsString() inicioSintomas?: string;
  @IsOptional() @IsString() perfilCliente?: string;
  @IsOptional() @IsString() destreza?: string;
  @IsOptional() @IsBoolean() dntui?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tiposIU?: string[];
  @IsOptional() @IsBoolean() miccaoEspontanea?: boolean;
  @IsOptional() @IsNumber() volumeAproximadoMl?: number;
  @IsOptional() @IsBoolean() realizaCateterismo?: boolean;
  @IsOptional() @IsNumber() cateterismosDia?: number;
  @IsOptional() @IsString() cateterUtilizado?: string;
  @IsOptional() @IsString() ultimaInfeccaoUrinaria?: string;
  @IsOptional() @IsBoolean() emTratamento?: boolean;
  @IsOptional() @IsString() tratamento?: string;
  @IsOptional() @IsString() volumeDrenado?: string;
  @IsOptional() @IsString() outrasIntercorrencias?: string;
  @IsOptional() @ValidateNested() @Type(() => CateterIndicadoDto) cateterIndicado?: CateterIndicadoDto;
  @IsOptional() @IsString() encaminhamento?: string;
  @IsOptional() @IsString() localEncaminhamento?: string;
  @IsOptional() @IsString() responsavelCateterismo?: string;
  @IsOptional() @IsBoolean() autorizaPesquisa?: boolean;
  @IsOptional() @IsBoolean() aceitaInformacoes?: boolean;
  @IsOptional() @IsString() emailContato?: string;
  @IsOptional() @IsString() whatsappContato?: string;
  @IsOptional() @IsString() coren?: string;
  @IsOptional() @IsString() respCuidador?: string;
}

/** Registro da consulta de enfermagem — ligação de acompanhamento + chegada da sonda de teste. */
export class RegistroEnfermagemDto {
  @IsOptional() @IsISO8601() dataLigacao?: string;
  @IsOptional() @IsISO8601() sondaChegouEm?: string;
  @IsOptional() @IsString() observacoes?: string;
}
