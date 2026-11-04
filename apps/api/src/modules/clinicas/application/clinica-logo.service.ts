import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { DocumentStorage } from '../../documentos/application/ports/document-storage';
import { CLINICA_REPOSITORY, LOGO_MAX_BYTES, LOGO_MIME_EXTENSAO } from '../clinicas.constants';
import { ClinicaRepository } from './ports/clinica.repository';

export interface LogoRequestContext {
  ip: string;
  userAgent: string;
}

const ID_SEGURO = /^[A-Za-z0-9_-]+$/;

/**
 * Logo da clínica: cosmética, num bucket PRIVADO. O upload é um PUT presignado restrito a PNG/JPG e ao
 * tamanho declarado; a logo só entra em vigor em `confirmar`, depois do HeadObject. Persiste-se apenas a
 * CHAVE do objeto (a leitura é um GET presignado em GET /clinicas/minha). ADMIN só na própria clínica;
 * SUPER_ADMIN em qualquer uma. Não toca na identidade fiscal (documento/tipoDocumento/razão social).
 */
@Injectable()
export class ClinicaLogoService {
  private readonly logger = new Logger(ClinicaLogoService.name);

  constructor(
    @Inject(CLINICA_REPOSITORY) private readonly clinicas: ClinicaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    @Inject('DOCUMENT_STORAGE') private readonly storage: DocumentStorage,
  ) {}

  async solicitarUpload(
    actor: AuthTokenPayload,
    clinicaId: string,
    dto: { mimeType: string; tamanho: number; hash: string },
    _context: LogoRequestContext,
  ): Promise<{ uploadUrl: string; logoKey: string; expiresInSeconds: number }> {
    await this.autorizarEExistir(actor, clinicaId);

    const extensao = Object.prototype.hasOwnProperty.call(LOGO_MIME_EXTENSAO, dto.mimeType)
      ? LOGO_MIME_EXTENSAO[dto.mimeType]
      : undefined;
    if (!extensao) {
      throw new UnprocessableEntityException('A logo deve ser PNG ou JPG.');
    }
    if (!Number.isInteger(dto.tamanho) || dto.tamanho <= 0 || dto.tamanho > LOGO_MAX_BYTES) {
      throw new UnprocessableEntityException('A logo deve ter até 2 MB.');
    }

    // Chave sem dado do cliente: nem nome de arquivo. Nova a cada pedido (não sobrescreve a logo vigente).
    const logoKey = `logos/${clinicaId}/${randomUUID()}.${extensao}`;
    const presigned = await this.storage.createUploadUrl({
      key: logoKey,
      mimeType: dto.mimeType,
      tamanho: dto.tamanho,
      hash: dto.hash,
    });

    return { uploadUrl: presigned.uploadUrl, logoKey, expiresInSeconds: presigned.expiresInSeconds };
  }

  async confirmar(
    actor: AuthTokenPayload,
    clinicaId: string,
    dto: { logoKey: string },
    context: LogoRequestContext,
  ): Promise<void> {
    await this.autorizarEExistir(actor, clinicaId);

    // A chave precisa ser do prefixo DESTA clínica, no formato que geramos (sem traversal, sem URL, sem SVG).
    const formato = new RegExp(`^logos/${clinicaId}/[A-Za-z0-9-]+\\.(png|jpg)$`);
    if (typeof dto.logoKey !== 'string' || !formato.test(dto.logoKey)) {
      throw new BadRequestException('Chave de logo inválida para esta clínica.');
    }

    // R4: o objeto precisa existir e ser PNG/JPG de até 2 MB ANTES de a chave ser gravada.
    const privateUrl = this.storage.privateUrlForKey(dto.logoKey);
    const head = await this.storage.headObject(privateUrl);
    if (!head) {
      throw new UnprocessableEntityException('Arquivo da logo não encontrado. Envie novamente.');
    }
    const mimeOk = !!head.mimeType && Object.prototype.hasOwnProperty.call(LOGO_MIME_EXTENSAO, head.mimeType);
    if (!mimeOk || head.tamanho <= 0 || head.tamanho > LOGO_MAX_BYTES) {
      await this.descartar(privateUrl);
      throw new UnprocessableEntityException('A logo deve ser PNG ou JPG de até 2 MB.');
    }

    const atualizada = await this.clinicas.update(clinicaId, { logoKey: dto.logoKey });
    if (!atualizada) {
      throw new NotFoundException('Clinica nao encontrada.');
    }
    await this.auditar(actor, clinicaId, AuditEvent.CLINIC_LOGO_UPDATED, context);
  }

  async remover(actor: AuthTokenPayload, clinicaId: string, context: LogoRequestContext): Promise<void> {
    await this.autorizarEExistir(actor, clinicaId);

    // Só limpa a chave: o objeto antigo fica no bucket (sem delete físico).
    const atualizada = await this.clinicas.update(clinicaId, { logoKey: null });
    if (!atualizada) {
      throw new NotFoundException('Clinica nao encontrada.');
    }
    await this.auditar(actor, clinicaId, AuditEvent.CLINIC_LOGO_REMOVED, context);
  }

  /** ADMIN: só a clínica do próprio token. SUPER_ADMIN: qualquer uma (precisa existir). Demais papéis: 403. */
  private async autorizarEExistir(actor: AuthTokenPayload, clinicaId: string): Promise<void> {
    const proprioAdmin = actor.papel === Papel.ADMIN && !!actor.clinicaId && actor.clinicaId === clinicaId;
    if (actor.papel !== Papel.SUPER_ADMIN && !proprioAdmin) {
      throw new ForbiddenException('Sem permissao para alterar a logo desta clinica.');
    }
    if (typeof clinicaId !== 'string' || !ID_SEGURO.test(clinicaId)) {
      throw new NotFoundException('Clinica nao encontrada.');
    }
    if (!(await this.clinicas.findById(clinicaId))) {
      throw new NotFoundException('Clinica nao encontrada.');
    }
  }

  private async descartar(privateUrl: string): Promise<void> {
    try {
      await this.storage.deleteObject(privateUrl);
    } catch (error) {
      this.logger.warn(`Falha ao remover logo inválida do bucket: ${(error as Error).message}`);
    }
  }

  private async auditar(
    actor: AuthTokenPayload,
    clinicaId: string,
    event: AuditEvent,
    context: LogoRequestContext,
  ): Promise<void> {
    await this.auditLogs.create({
      event,
      userId: actor.sub,
      email: actor.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { clinicaId },
    });
  }
}
