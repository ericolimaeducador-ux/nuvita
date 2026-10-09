import { Documento } from '../../domain/documento.entity';

export interface PresignedUploadInput {
  key: string;
  mimeType: string;
  tamanho: number;
  hash: string;
}

export interface PresignedUploadOutput {
  uploadUrl: string;
  privateUrl: string;
  expiresInSeconds: number;
}

export interface DocumentStorage {
  createUploadUrl(input: PresignedUploadInput): Promise<PresignedUploadOutput>;
  /** `downloadFilename`: nome genérico (sem dado pessoal) sugerido ao baixar. */
  createReadUrl(privateUrl: string, expiresInSeconds: number, downloadFilename?: string): Promise<string>;
  createThumbnailIfSupported(documento: Documento): Promise<string | undefined>;
  /** Metadados do objeto no bucket: `undefined` se não existe; lança se o storage estiver indisponível. */
  headObject(privateUrl: string): Promise<{ tamanho: number } | undefined>;
  /** Remove o objeto (e seu thumbnail, se houver) do storage. Best-effort. */
  deleteObject(privateUrl: string): Promise<void>;
}
