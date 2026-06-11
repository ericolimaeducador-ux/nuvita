import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanoClinica } from '../../domain/clinica.entity';

export class EnderecoClinicaDto {
  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  cep?: string;
}

export class ConfiguracoesClinicaDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  corPrimaria?: string;

  @IsOptional()
  @IsString()
  whatsappNumero?: string;

  @IsOptional()
  @IsEmail()
  emailRemetente?: string;

  @IsString()
  fusoHorario!: string;

  @IsInt()
  @Min(5)
  duracaoConsultaPadrao!: number;
}

export class PrimeiroAdminDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;
}

export class CreateClinicaDto {
  @IsString()
  nome!: string;

  @IsString()
  cnpj!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoClinicaDto)
  endereco?: EnderecoClinicaDto;

  @IsEnum(PlanoClinica)
  plano!: PlanoClinica;

  @ValidateNested()
  @Type(() => ConfiguracoesClinicaDto)
  configuracoes!: ConfiguracoesClinicaDto;

  @ValidateNested()
  @Type(() => PrimeiroAdminDto)
  primeiroAdmin!: PrimeiroAdminDto;
}
