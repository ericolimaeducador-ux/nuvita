import { IsEnum, IsString, Validate } from 'class-validator';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { DocumentoFiscalConstraint } from './documento-fiscal.validator';

/** Corpo de PATCH /clinicas/minha/documento: o documento do consultório, informado uma única vez. */
export class PreencherDocumentoDto {
  @IsEnum(TipoDocumentoFiscal)
  tipoDocumento!: TipoDocumentoFiscal;

  /** CPF ou CNPJ conforme `tipoDocumento`; aceita com ou sem pontuação. */
  @IsString()
  @Validate(DocumentoFiscalConstraint)
  documento!: string;
}
