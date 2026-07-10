import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import {
  DOCUMENTO_REPOSITORY,
  DOCUMENT_ACCESS_URL_TTL_SECONDS,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_PATIENT_STORAGE_BYTES,
} from '../documentos.constants';
import { ALLOWED_DOCUMENT_MIME_TYPES } from '../domain/documento.entity';

// Extensão de arquivo por MIME type permitido — usada para nomear o objeto no
// storage de forma legível ao baixar.
const EXTENSAO_POR_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/dicom': '.dcm',
};
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ListDocumentosQueryDto } from './dto/list-documentos-query.dto';
import { DocumentStorage } from './ports/document-storage';
import { DocumentoRepository } from './ports/documento.repository';

export interface DocumentoRequestContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

@Injectable()
export class DocumentosService {
  constructor(
    @Inject(DOCUMENTO_REPOSITORY) private readonly documentos: DocumentoRepository,
    @Inject('DOCUMENT_STORAGE') private readonly storage: DocumentStorage,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto, context: DocumentoRequestContext) {
    this.assertAllowedMimeType(dto.mimeType);
    this.assertAllowedSize(dto.tamanho);
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    const usedBytes = await this.documentos.sumActivePatientBytes(clinicaId, dto.pacienteId);
    if (usedBytes + dto.tamanho > MAX_PATIENT_STORAGE_BYTES) {
      throw new BadRequestException('Limite de 500MB por paciente excedido.');
    }

    const key = this.buildObjectKey(clinicaId, dto.pacienteId, dto.nomePaciente, dto.nome, dto.mimeType);
    const presigned = await this.storage.createUploadUrl({
      key,
      mimeType: dto.mimeType,
      tamanho: dto.tamanho,
      hash: dto.hash.toLowerCase(),
    });
    const documento = await this.documentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      prontuarioId: dto.prontuarioId,
      nome: dto.nome,
      tipo: dto.tipo,
      mimeType: dto.mimeType,
      tamanho: dto.tamanho,
      url: presigned.privateUrl,
      hash: dto.hash.toLowerCase(),
      uploadPor: context.user.sub,
    });

    await this.audit(AuditEvent.DOCUMENT_UPLOAD_URL_CREATED, context, {
      clinicaId,
      pacienteId: dto.pacienteId,
      prontuarioId: dto.prontuarioId,
      documentoId: documento.id,
      tamanho: dto.tamanho,
      mimeType: dto.mimeType,
    });

    return {
      documento,
      uploadUrl: presigned.uploadUrl,
      expiresInSeconds: presigned.expiresInSeconds,
      requiredHeaders: {
        'Content-Type': dto.mimeType,
        // A URL presignada assina o Metadata do PutObjectCommand (ver
        // s3-document-storage.service.ts) — sem este header exato, o S3/R2
        // rejeita o PUT com SignatureDoesNotMatch.
        'x-amz-meta-sha256': dto.hash.toLowerCase(),
      },
    };
  }

  async confirmUpload(documentoId: string, clinicaId: string | undefined, context: DocumentoRequestContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const documento = await this.getDocumentoOrThrow(resolvedClinicaId, documentoId);
    const thumbnailUrl = await this.storage.createThumbnailIfSupported(documento);
    if (thumbnailUrl) {
      await this.documentos.setThumbnail(resolvedClinicaId, documentoId, thumbnailUrl);
    }

    await this.audit(AuditEvent.DOCUMENT_UPLOAD_CONFIRMED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId: documento.pacienteId,
      prontuarioId: documento.prontuarioId,
      documentoId,
      thumbnail: Boolean(thumbnailUrl),
    });

    return {
      ...documento,
      thumbnailUrl: thumbnailUrl ?? documento.thumbnailUrl,
    };
  }

  async list(query: ListDocumentosQueryDto, context: DocumentoRequestContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);
    const documentos = await this.documentos.list({
      clinicaId,
      pacienteId: query.pacienteId,
      prontuarioId: query.prontuarioId,
    });

    await this.audit(AuditEvent.DOCUMENT_LISTED, context, {
      clinicaId,
      pacienteId: query.pacienteId,
      prontuarioId: query.prontuarioId,
      quantidade: documentos.length,
    });

    return documentos;
  }

  async createAccessUrl(documentoId: string, clinicaId: string | undefined, context: DocumentoRequestContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const documento = await this.getDocumentoOrThrow(resolvedClinicaId, documentoId);
    const accessUrl = await this.storage.createReadUrl(documento.url, DOCUMENT_ACCESS_URL_TTL_SECONDS);

    await this.audit(AuditEvent.DOCUMENT_VIEW_URL_CREATED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId: documento.pacienteId,
      prontuarioId: documento.prontuarioId,
      documentoId,
      expiresInSeconds: DOCUMENT_ACCESS_URL_TTL_SECONDS,
    });

    return {
      accessUrl,
      expiresInSeconds: DOCUMENT_ACCESS_URL_TTL_SECONDS,
    };
  }

  async softDelete(documentoId: string, clinicaId: string | undefined, context: DocumentoRequestContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const documento = await this.documentos.softDelete(resolvedClinicaId, documentoId, context.user.sub);
    if (!documento) {
      throw new NotFoundException('Documento nao encontrado.');
    }

    // Libera o armazenamento no R2 de fato (o registro no banco fica como soft
    // delete p/ trilha de auditoria). Best-effort: se a remoção física falhar,
    // a exclusão lógica já ocorreu — não derrubamos a requisição por isso.
    try {
      await this.storage.deleteObject(documento.url);
    } catch {
      // objeto pode já não existir; a auditoria abaixo registra a exclusão lógica
    }

    await this.audit(AuditEvent.DOCUMENT_SOFT_DELETED, context, {
      clinicaId: resolvedClinicaId,
      pacienteId: documento.pacienteId,
      prontuarioId: documento.prontuarioId,
      documentoId,
    });

    return documento;
  }

  private async getDocumentoOrThrow(clinicaId: string, documentoId: string) {
    const documento = await this.documentos.findById(clinicaId, documentoId);
    if (!documento) {
      throw new NotFoundException('Documento nao encontrado.');
    }

    return documento;
  }

  private assertAllowedMimeType(mimeType: string): void {
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new BadRequestException('Tipo de arquivo nao permitido. Use PDF, JPG, PNG ou DICOM.');
    }
  }

  private assertAllowedSize(tamanho: number): void {
    if (tamanho > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException('Limite de 50MB por arquivo excedido.');
    }
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  private buildObjectKey(
    clinicaId: string,
    pacienteId: string,
    nomePaciente: string | undefined,
    nomeDocumento: string,
    mimeType: string,
  ): string {
    // Nome legível do arquivo = "<nome do paciente> - <titulo do documento>",
    // para que o download traga um nome que faz sentido. O UUID garante unicidade
    // da chave mesmo que dois documentos tenham o mesmo nome.
    const partes = [nomePaciente, nomeDocumento].map((p) => this.slug(p)).filter(Boolean);
    const base = partes.join('-') || 'documento';
    const extensao = EXTENSAO_POR_MIME[mimeType] ?? '';
    return `${clinicaId}/pacientes/${pacienteId}/${randomUUID()}-${base}${extensao}`;
  }

  // Remove acentos e caracteres inseguros para chaves de objeto S3/R2, mantendo
  // legibilidade (espaços viram "_").
  private slug(value: string | undefined): string {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private async audit(
    event: AuditEvent,
    context: DocumentoRequestContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
