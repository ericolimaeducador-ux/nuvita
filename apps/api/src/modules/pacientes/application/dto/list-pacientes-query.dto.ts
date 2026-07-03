import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EtapaFluxoClinico } from '../../../../../../../packages/shared/src/fluxo-clinico';

export class ListPacientesQueryDto {
  @IsOptional()
  @IsMongoId()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  incluirInativos?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  programaIU?: boolean;

  @IsOptional()
  @IsEnum(EtapaFluxoClinico)
  etapaFluxo?: EtapaFluxoClinico;
}
