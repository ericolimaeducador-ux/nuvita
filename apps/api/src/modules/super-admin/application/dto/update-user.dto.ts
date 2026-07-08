import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Modulo, Papel } from '../../../../../../../packages/shared/src/auth';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;

  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Exceções de permissão por usuário sobre o padrão do papel.
  @IsOptional()
  @IsArray()
  @IsEnum(Modulo, { each: true })
  modulosConcedidos?: Modulo[];

  @IsOptional()
  @IsArray()
  @IsEnum(Modulo, { each: true })
  modulosRevogados?: Modulo[];
}
