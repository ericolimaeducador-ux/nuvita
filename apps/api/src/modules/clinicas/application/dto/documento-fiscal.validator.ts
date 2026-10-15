import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  documentoFiscalValido,
  TipoDocumentoFiscal,
} from '../../../../../../../packages/shared/src/documentos';

/**
 * Valida `documento` conforme o `tipoDocumento` do mesmo objeto (dígitos verificadores
 * de CPF ou de CNPJ, inclusive alfanumérico). Tipo ausente ou inválido é reportado pelo
 * @IsEnum do próprio campo; aqui só recusamos.
 */
@ValidatorConstraint({ name: 'documentoFiscal', async: false })
export class DocumentoFiscalConstraint implements ValidatorConstraintInterface {
  validate(valor: unknown, args: ValidationArguments): boolean {
    const tipo = (args.object as { tipoDocumento?: unknown }).tipoDocumento;
    if (typeof valor !== 'string') return false;
    if (tipo !== TipoDocumentoFiscal.CPF && tipo !== TipoDocumentoFiscal.CNPJ) return false;
    return documentoFiscalValido(tipo, valor);
  }

  defaultMessage(args: ValidationArguments): string {
    const tipo = (args.object as { tipoDocumento?: unknown }).tipoDocumento;
    return tipo === TipoDocumentoFiscal.CPF ? 'CPF inválido.' : 'CNPJ inválido.';
  }
}
