import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PlanoClinica } from '../../../clinicas/domain/clinica.entity';

const trimTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @IsEnum(PlanoClinica)
  plano?: PlanoClinica;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  /** Desmarcar no lançamento: todos os usuários da clínica passam a aceitar os Termos de Uso. */
  @IsOptional()
  @IsBoolean()
  faseTeste?: boolean;

  /** Contato impresso no timbre dos documentos clínicos (gravado em configuracoes). */
  @IsOptional()
  @Transform(trimTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @Transform(trimTexto)
  @IsEmail()
  emailContato?: string;
}
