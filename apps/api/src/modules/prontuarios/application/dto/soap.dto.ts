import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
}

export class ObjetivoDto {
  @IsOptional()
  @IsString()
  exameFisico?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SinaisVitaisDto)
  sinaisVitais?: SinaisVitaisDto;
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

export class CateterVaProDto {
  @IsOptional() @IsString() sexo?: string;
  @IsOptional() @IsNumber() french?: number;
  @IsOptional() @IsNumber() codigo?: number;
}

/**
 * Questionário VaPro/Hollister (Ficha de Avaliação de Incontinência Urinária),
 * amarrado ao prontuário SOAP. Todos os campos são opcionais — a ficha só é
 * preenchida quando o atendimento envolve o programa VaPro.
 */
export class FichaVaProDto {
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
  @IsOptional() @ValidateNested() @Type(() => CateterVaProDto) cateterVaProIndicado?: CateterVaProDto;
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
