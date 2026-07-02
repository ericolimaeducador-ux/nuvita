import { IsEnum, IsISO8601, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAtendimento } from '../../domain/prontuario.entity';
import {
  ArquivoProntuarioDto,
  AvaliacaoDto,
  FichaAvaliacaoIUDto,
  ObjetivoDto,
  PlanoDto,
  RelatorioJudicialDto,
  SubjetivoDto,
} from './soap.dto';

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

  @ValidateNested()
  @Type(() => SubjetivoDto)
  subjetivo!: SubjetivoDto;

  @ValidateNested()
  @Type(() => ObjetivoDto)
  objetivo!: ObjetivoDto;

  @ValidateNested()
  @Type(() => AvaliacaoDto)
  avaliacao!: AvaliacaoDto;

  @ValidateNested()
  @Type(() => PlanoDto)
  plano!: PlanoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FichaAvaliacaoIUDto)
  fichaAvaliacaoIU?: FichaAvaliacaoIUDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RelatorioJudicialDto)
  relatorioJudicial?: RelatorioJudicialDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
