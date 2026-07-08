import { IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EtapaFluxoClinico } from '../../../../../../../packages/shared/src/fluxo-clinico';
import { PACIENTE_SORTS, PacienteSort } from '../ports/paciente.repository';

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

  // Dia exato de nascimento (YYYY-MM-DD) — o repositório converte no
  // intervalo [00:00Z, 24:00Z) porque o campo é gravado como meia-noite UTC.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataNascimento deve ser YYYY-MM-DD.' })
  dataNascimento?: string;

  @IsOptional()
  @IsIn(PACIENTE_SORTS)
  sort?: PacienteSort;

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
