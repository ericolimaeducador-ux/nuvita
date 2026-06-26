import { IsEnum, IsISO8601, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAtendimento } from '../../domain/prontuario.entity';
import {
  ArquivoProntuarioDto,
  AvaliacaoDto,
  FichaVaProDto,
  ObjetivoDto,
  PlanoDto,
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
  @Type(() => FichaVaProDto)
  fichaVaPro?: FichaVaProDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ArquivoProntuarioDto)
  arquivos?: ArquivoProntuarioDto[];
}
