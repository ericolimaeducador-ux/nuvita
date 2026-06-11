import { IsEmail, IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { Papel } from '../../../../../../../packages/shared/src/auth';

export class RegisterUserDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsEnum(Papel)
  papel!: Papel;

  @IsOptional()
  @IsMongoId()
  clinicaId?: string;
}
