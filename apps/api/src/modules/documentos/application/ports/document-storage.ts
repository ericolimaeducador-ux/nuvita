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
  createReadUrl(privateUrl: string, expiresInSeconds: number): Promise<string>;
  createThumbnailIfSupported(documento: Documento): Promise<string | undefined>;
}
