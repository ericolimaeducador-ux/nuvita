import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassificacaoArea, LinhaTerapeutica, ProjetoPaciente, Sexo } from '../../domain/paciente.entity';
import { ConsentimentoLGpdDto } from './consentimento-lgpd.dto';
import { ConvenioDto } from './convenio.dto';
import { EnderecoDto } from './endereco.dto';
import { IsCpfValido, IsDataNaoFutura } from './paciente-campos.validator';
import { AutorizacaoResponsavelDto, ResponsavelLegalDto } from './responsavel-legal.dto';

export class CreatePacienteDto {
  @IsMongoId()
  clinicaId!: string;

  // Classificação de área: ao menos uma (IU, FA, OT), sem repetição. No PATCH (Partial) é opcional,
  // mas se vier, também não pode ser vazia.
  @IsArray()
  @ArrayNotEmpty({ message: 'Informe ao menos uma classificação (IU, FA ou OT).' })
  @ArrayUnique()
  @IsEnum(ClassificacaoArea, { each: true })
  classificacoes!: ClassificacaoArea[];

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  @IsCpfValido()
  cpf?: string;

  // Obrigatória SÓ no cadastro (aqui): sem ela não dá para saber se o paciente é
  // menor de idade, e a regra de responsável legal depende dessa classificação.
  // Em UpdatePacienteDto (PartialType deste DTO) ela volta a ser opcional, para
  // não travar a edição de pacientes já cadastrados sem essa data.
  @IsISO8601()
  @IsDataNaoFutura()
  dataNascimento!: string;

  @IsOptional()
  @IsEnum(Sexo)
  sexo?: Sexo;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco?: EnderecoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConvenioDto)
  convenio?: ConvenioDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentimentoLGpdDto)
  consentimentoLGPD?: ConsentimentoLGpdDto;

  @IsOptional()
  @IsEnum(ProjetoPaciente)
  projeto?: ProjetoPaciente;

  @IsOptional()
  @IsEnum(LinhaTerapeutica)
  linhaTerapeutica?: LinhaTerapeutica;

  @IsOptional()
  @IsString()
  representante?: string;

  // Objeto inteiro opcional aqui — obrigatoriedade condicional (paciente menor)
  // é validada em PacientesService.create()/update(), não neste DTO.
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelLegalDto)
  responsavelLegal?: ResponsavelLegalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AutorizacaoResponsavelDto)
  autorizacaoResponsavel?: AutorizacaoResponsavelDto;
}
