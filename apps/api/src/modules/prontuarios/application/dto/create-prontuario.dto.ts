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
  RegistroPsicologicoDto,
  RelatorioJudicialDto,
  SubjetivoDto,
} from './soap.dto';

// Consulta de enfermagem e psicoterapia não são SOAPs tradicionais — os 4
// blocos SOAP ficam dispensados de validação/obrigatoriedade nesses tipos.
const ehAtendimentoSoap = (o: CreateProntuarioDto) =>
  o.tipo !== TipoAtendimento.CONSULTA_ENFERMAGEM && o.tipo !== TipoAtendimento.PSICOTERAPIA;

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

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => SubjetivoDto)
  subjetivo?: SubjetivoDto;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => ObjetivoDto)
  objetivo?: ObjetivoDto;

  @ValidateIf(ehAtendimentoSoap)
  @ValidateNested()
  @Type(() => AvaliacaoDto)
  avaliacao?: AvaliacaoDto;

  @ValidateIf(ehAtendimentoSoap)
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
  @Type(() => RegistroPsicologicoDto)
  registroPsicologico?: RegistroPsicologicoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RelatorioJudicialDto)
  relatorioJudicial?: RelatorioJudicialDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
