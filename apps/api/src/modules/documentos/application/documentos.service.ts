import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreateNotificacaoDto } from '../../notificacoes/application/dto/create-notificacao.dto';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  DOCUMENTO_REPOSITORY,
  DOCUMENT_ACCESS_URL_TTL_SECONDS,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_PATIENT_STORAGE_BYTES,
} from '../documentos.constants';
import { ALLOWED_DOCUMENT_MIME_TYPES, Documento } from '../domain/documento.entity';

// Extensão de arquivo por MIME type permitido (allowlist). É a ÚNICA fonte da
// extensão da chave do objeto e do nome sugerido no download: nunca vem do
// nome do arquivo ou do título informados pelo usuário.
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
  private readonly logger = new Logger(DocumentosService.name);

  constructor(
    @Inject(DOCUMENTO_REPOSITORY) private readonly documentos: DocumentoRepository,
    @Inject('DOCUMENT_STORAGE') private readonly storage: DocumentStorage,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto, context: DocumentoRequestContext) {
    this.assertAllowedMimeType(dto.mimeType);
    this.assertAllowedSize(dto.tamanho);
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);
    const usedBytes = await this.documentos.sumActivePatientBytes(clinicaId, dto.pacienteId);
    if (usedBytes + dto.tamanho > MAX_PATIENT_STORAGE_BYTES) {
      throw new BadRequestException('Limite de 500MB por paciente excedido.');
    }

    const key = this.buildObjectKey(clinicaId, dto.pacienteId, dto.mimeType);
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
        // Headers que o navegador DEVE enviar no PUT: a URL assina ambos (ver createUploadUrl em
        // s3-document-storage.service.ts); com valor diferente o R2 responde 403 SignatureDoesNotMatch.
        'Content-Type': dto.mimeType,
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

    await this.notificarResultadoDisponivel(documento, resolvedClinicaId, context);

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
    const accessUrl = await this.storage.createReadUrl(
      documento.url,
      DOCUMENT_ACCESS_URL_TTL_SECONDS,
      this.buildDownloadFilename(documento),
    );

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

  // A chave do objeto não carrega dado pessoal: nem nome do paciente, nem título
  // ou nome do arquivo (a chave aparece em URLs, logs do storage e histórico).
  private buildObjectKey(clinicaId: string, pacienteId: string, mimeType: string): string {
    return `${clinicaId}/pacientes/${pacienteId}/${randomUUID()}${EXTENSAO_POR_MIME[mimeType] ?? ''}`;
  }

  // Nome genérico sugerido no download (vai na query string da URL assinada).
  // Data de criação em UTC + extensão da allowlist; nunca o título.
  private buildDownloadFilename(documento: Documento): string {
    const data = new Date(documento.criadoEm).toISOString().slice(0, 10);
    return `documento-${data}${EXTENSAO_POR_MIME[documento.mimeType] ?? ''}`;
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

  /**
   * Dispara a notificação de resultado disponível (RESULTADO_DISPONIVEL) via
   * NotificacoesService.create() — mesmo padrão de
   * AgendamentosService.notificarConfirmacaoAgendamento() e
   * TelemedicinaService.notificarLinkTeleconsulta(): método público
   * (enfileira no BullMQ de verdade), efeito colateral não crítico, falha
   * logada (fail-closed com visibilidade) e nunca derruba a confirmação de
   * upload.
   */
  private async notificarResultadoDisponivel(
    documento: Documento,
    clinicaId: string,
    context: DocumentoRequestContext,
  ): Promise<void> {
    const paciente = (await this.pacientesService.resumoPorIds(clinicaId, [documento.pacienteId])).get(
      documento.pacienteId,
    );
    if (!paciente?.email) {
      return;
    }

    try {
      await this.notificacoesService.create(
        {
          clinicaId,
          destinatarioId: documento.pacienteId,
          tipo: TipoNotificacao.RESULTADO_DISPONIVEL,
          canal: CanalNotificacao.EMAIL,
          email: paciente.email,
          nome: paciente.nomeDestinatario,
          nomePaciente: paciente.nome,
          paraResponsavel: paciente.ehResponsavel,
          documento: documento.nome,
        } as CreateNotificacaoDto,
        context,
      );
    } catch (error) {
      this.logFalhaNotificacao(TipoNotificacao.RESULTADO_DISPONIVEL, clinicaId, documento.id, error);
    }
  }

  private logFalhaNotificacao(
    tipo: TipoNotificacao,
    clinicaId: string,
    documentoId: string,
    error: unknown,
  ): void {
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Falha ao acionar notificacao pos-confirmacao de upload; documento foi confirmado normalmente.',
        event: 'notification_trigger_failed',
        tipo,
        clinicaId,
        documentoId,
        erro: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
