import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Papel } from '../../../../../../../packages/shared/src/auth';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;

  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
