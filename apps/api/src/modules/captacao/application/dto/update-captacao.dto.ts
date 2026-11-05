import { Type } from 'class-transformer';
import { IsEmail, IsISO8601, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { IsCpfValido, IsDataNaoFutura } from '../../../pacientes/application/dto/paciente-campos.validator';
import { AutorizacaoResponsavelDto, ResponsavelLegalDto } from '../../../pacientes/application/dto/responsavel-legal.dto';

/**
 * Completar um lead PENDENTE antes de exportar (ex.: a data de nascimento, que o formulário público não exige).
 * Mesmas regras do CreatePacienteDto para os campos que vierem: CPF com dígitos válidos, data de nascimento não futura,
 * responsável legal e autorização no mesmo formato. Telefone e código do captador não são editáveis aqui.
 * Salvar NÃO exporta: a exportação continua sendo uma ação separada.
 */
export class UpdateCaptacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { message: 'CPF inválido.' })
  @IsCpfValido()
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  @IsDataNaoFutura()
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  endereco?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  // Obrigatório para menor de idade na EXPORTAÇÃO (regra do PacientesService); aqui só é validado o formato.
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelLegalDto)
  responsavelLegal?: ResponsavelLegalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AutorizacaoResponsavelDto)
  autorizacaoResponsavel?: AutorizacaoResponsavelDto;
}
