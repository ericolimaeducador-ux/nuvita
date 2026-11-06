import { IsEmail, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CODIGOS_ENFERMEIRO_CAPTADOR } from '../../captacao.constants';
import { IsCpfValido } from '../../../pacientes/application/dto/paciente-campos.validator';

export class CreateCaptacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string;

  // R1.8: formato E dígitos verificadores (recusa sequências repetidas como 000.000.000-00), como no cadastro de paciente.
  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF inválido.' })
  @IsCpfValido({ message: 'CPF inválido.' })
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endereco?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  telefone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsIn([...CODIGOS_ENFERMEIRO_CAPTADOR], { message: 'Código do enfermeiro captador inválido.' })
  codigoEnfermeiro!: string;
}
