import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Papel } from '../../../../../../../packages/shared/src/auth';

export class CreateClinicaUsuarioDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsIn([Papel.MEDICO, Papel.SECRETARIA])
  papel!: Papel.MEDICO | Papel.SECRETARIA;
}
