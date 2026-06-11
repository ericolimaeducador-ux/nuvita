import { IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  AllowedDocumentMimeType,
  TipoDocumento,
} from '../../domain/documento.entity';
import { MAX_DOCUMENT_SIZE_BYTES } from '../../documentos.constants';

export class CreateUploadUrlDto {
  @IsMongoId()
  clinicaId!: string;

  @IsMongoId()
  pacienteId!: string;

  @IsOptional()
  @IsMongoId()
  prontuarioId?: string;

  @IsString()
  nome!: string;

  @IsEnum(TipoDocumento)
  tipo!: TipoDocumento;

  @IsIn([...ALLOWED_DOCUMENT_MIME_TYPES])
  mimeType!: AllowedDocumentMimeType;

  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_SIZE_BYTES)
  tamanho!: number;

  @Matches(/^[a-f0-9]{64}$/i)
  hash!: string;
}
