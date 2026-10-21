import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, Validate, ValidateIf } from 'class-validator';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { DocumentoFiscalConstraint } from '../../../clinicas/application/dto/documento-fiscal.validator';
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

  /**
   * Identidade fiscal: imutável para a clínica, corrigível só pelo SUPER_ADMIN (esta rota). Os dois
   * campos andam juntos: se um vier, o outro é obrigatório e o par é validado como no create.
   */
  @ValidateIf((o: UpdateClinicaDto) => o.documento !== undefined || o.tipoDocumento !== undefined)
  @IsEnum(TipoDocumentoFiscal)
  tipoDocumento?: TipoDocumentoFiscal;

  @ValidateIf((o: UpdateClinicaDto) => o.documento !== undefined || o.tipoDocumento !== undefined)
  @IsString()
  @Validate(DocumentoFiscalConstraint)
  documento?: string;
}
