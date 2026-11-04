import { DocumentoEmitido } from '../../domain/documento-emitido.entity';

export type CreateDocumentoEmitidoInput = Omit<DocumentoEmitido, 'id'>;

export interface DocumentoEmitidoRepository {
  create(input: CreateDocumentoEmitidoInput): Promise<DocumentoEmitido>;
}
