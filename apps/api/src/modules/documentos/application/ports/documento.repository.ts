import { AllowedDocumentMimeType, Documento, TipoDocumento } from '../../domain/documento.entity';

export interface CreateDocumentoInput {
  clinicaId: string;
  pacienteId: string;
  prontuarioId?: string;
  nome: string;
  tipo: TipoDocumento;
  mimeType: AllowedDocumentMimeType;
  tamanho: number;
  url: string;
  hash: string;
  uploadPor: string;
  confirmadoEm: Date | null;
}

export interface ListDocumentoInput {
  clinicaId: string;
  pacienteId?: string;
  prontuarioId?: string;
}

export interface DocumentoRepository {
  create(input: CreateDocumentoInput): Promise<Documento>;
  findById(clinicaId: string, documentoId: string, incluirExcluidos?: boolean): Promise<Documento | null>;
  list(input: ListDocumentoInput): Promise<Documento[]>;
  sumActivePatientBytes(clinicaId: string, pacienteId: string): Promise<number>;
  setThumbnail(clinicaId: string, documentoId: string, thumbnailUrl: string): Promise<void>;
  setConfirmadoEm(clinicaId: string, documentoId: string, confirmadoEm: Date): Promise<void>;
  /** Registros com confirmadoEm = null (explícito; legado sem o campo NÃO entra) criados antes de `limite`, de todas as clínicas. */
  listNaoConfirmadosAte(limite: Date): Promise<Documento[]>;
  softDelete(clinicaId: string, documentoId: string, excluidoPor: string): Promise<Documento | null>;
}
