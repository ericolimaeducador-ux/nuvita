import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @IsOptional()
  @IsString()
  registroProfissional?: string;

  /** Correção do CRP pelo super-admin (auditada). Formato do CRP não validado — confirmar em fonte do CFP. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  crp?: string;

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
