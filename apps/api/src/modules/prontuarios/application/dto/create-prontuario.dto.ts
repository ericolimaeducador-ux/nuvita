import { IsEnum, IsISO8601, IsMongoId, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAtendimento } from '../../domain/prontuario.entity';
import {
  ArquivoProntuarioDto,
  AvaliacaoDto,
  FichaAvaliacaoIUDto,
  ObjetivoDto,
  PlanoDto,
  RegistroEnfermagemDto,
  RelatorioJudicialDto,
  SubjetivoDto,
} from './soap.dto';

const naoEhConsultaEnfermagem = (o: CreateProntuarioDto) => o.tipo !== TipoAtendimento.CONSULTA_ENFERMAGEM;

export class CreateProntuarioDto {
  @IsMongoId()
  clinicaId!: string;

  @IsMongoId()
  pacienteId!: string;

  @IsOptional()
  @IsMongoId()
  agendamentoId?: string;

  @IsISO8601()
  dataAtendimento!: string;

  @IsEnum(TipoAtendimento)
  tipo!: TipoAtendimento;

  // Consulta de enfermagem não é um SOAP tradicional — esses 4 campos ficam
  // dispensados de validação/obrigatoriedade só para esse tipo de atendimento.
  @ValidateIf(naoEhConsultaEnfermagem)
  @ValidateNested()
  @Type(() => SubjetivoDto)
  subjetivo?: SubjetivoDto;

  @ValidateIf(naoEhConsultaEnfermagem)
  @ValidateNested()
  @Type(() => ObjetivoDto)
  objetivo?: ObjetivoDto;

  @ValidateIf(naoEhConsultaEnfermagem)
  @ValidateNested()
  @Type(() => AvaliacaoDto)
  avaliacao?: AvaliacaoDto;

  @ValidateIf(naoEhConsultaEnfermagem)
  @ValidateNested()
  @Type(() => PlanoDto)
  plano?: PlanoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FichaAvaliacaoIUDto)
  fichaAvaliacaoIU?: FichaAvaliacaoIUDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegistroEnfermagemDto)
  registroEnfermagem?: RegistroEnfermagemDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RelatorioJudicialDto)
  relatorioJudicial?: RelatorioJudicialDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
