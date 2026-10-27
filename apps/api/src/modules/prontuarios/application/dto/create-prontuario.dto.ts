import { IsEnum, IsIn, IsISO8601, IsMongoId, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAtendimento } from '../../domain/prontuario.entity';
import {
  ArquivoProntuarioDto,
  AvaliacaoDto,
  ObjetivoDto,
  PlanoDto,
  RegistroPsicologicoDto,
  SubjetivoDto,
} from './soap.dto';

// Psicoterapia não é um SOAP tradicional — os 4 blocos SOAP ficam dispensados
// de validação/obrigatoriedade nesse tipo.
const ehAtendimentoSoap = (o: CreateProntuarioDto) => o.tipo !== TipoAtendimento.PSICOTERAPIA;

export class CreateProntuarioDto {
  @IsMongoId()
  clinicaId!: string;

  @IsMongoId()
  pacienteId!: string;

  /** Obrigatório: o prontuário nasce de um atendimento da agenda. */
  @IsMongoId()
  agendamentoId!: string;

  /** Obsoleto e IGNORADO: a data é o horário agendado. Aceito só para não quebrar uma tela antiga durante o deploy. */
  @IsOptional()
  @IsISO8601()
  dataAtendimento?: string;

  @IsEnum(TipoAtendimento)
  tipo!: TipoAtendimento;

  /** Formulário usado no registro de psicoterapia (avaliação inicial × seguimento): obrigatório e validado aqui. */
  @ValidateIf((o: CreateProntuarioDto) => o.tipo === TipoAtendimento.PSICOTERAPIA)
  @IsIn(['completo', 'seguimento'], { message: 'formulario deve ser completo ou seguimento' })
  formulario?: 'completo' | 'seguimento';

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
  @Type(() => RegistroPsicologicoDto)
  registroPsicologico?: RegistroPsicologicoDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
