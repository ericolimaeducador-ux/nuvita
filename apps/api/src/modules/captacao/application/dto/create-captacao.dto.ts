import { IsEmail, IsIn, IsISO8601, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { CODIGOS_ENFERMEIRO_CAPTADOR } from '../../captacao.constants';

export class CreateCaptacaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome!: string;

  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF inválido.' })
  cpf!: string;

  @IsISO8601()
  dataNascimento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  endereco!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  telefone!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsIn([...CODIGOS_ENFERMEIRO_CAPTADOR], { message: 'Código do enfermeiro captador inválido.' })
  codigoEnfermeiro!: string;
}
