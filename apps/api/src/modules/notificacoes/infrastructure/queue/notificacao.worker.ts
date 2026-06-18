import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConnectionOptions, Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { AUDIT_LOG_REPOSITORY } from '../../../auth/auth.constants';
import { AuditLogRepository } from '../../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../../auth/domain/audit-event.enum';
import { NotificacaoDispatcherService } from '../../application/notificacao-dispatcher.service';
import { NotificacaoRepository } from '../../application/ports/notificacao.repository';
import { NOTIFICACAO_REPOSITORY, NOTIFICATION_QUEUE_NAME } from '../../notificacoes.constants';
import { AppConfigService } from '../../../../common/security/config.service';

interface SendJobData {
  notificacaoId: string;
}

@Injectable()
export class NotificacaoWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<SendJobData>;

  constructor(
    private readonly configService: AppConfigService,
    private readonly dispatcher: NotificacaoDispatcherService,
    @Inject(NOTIFICACAO_REPOSITORY) private readonly notificacoes: NotificacaoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<SendJobData>(
      NOTIFICATION_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: new Redis(this.configService.getConfig().redisUrl, {
          maxRetriesPerRequest: null,
        }) as unknown as ConnectionOptions,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<SendJobData>): Promise<void> {
    const notificacao = await this.notificacoes.findById(job.data.notificacaoId);
    if (!notificacao) {
      return;
    }

    try {
      await this.dispatcher.dispatch(notificacao);
      await this.notificacoes.recordAttempt(notificacao.id);
      const sent = await this.notificacoes.markSent(notificacao.id);
      await this.auditLogs.create({
        event: AuditEvent.NOTIFICATION_SENT,
        ip: 'worker',
        userAgent: 'bullmq',
        metadata: {
          notificacaoId: notificacao.id,
          clinicaId: notificacao.clinicaId,
          destinatarioId: notificacao.destinatarioId,
          canal: notificacao.canal,
          tipo: notificacao.tipo,
          enviadoEm: sent?.enviadoEm,
        },
      });
    } catch (error) {
      const attempts = job.opts.attempts ?? 3;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;

      if (isFinalAttempt) {
        await this.notificacoes.recordAttempt(notificacao.id, error as Error);
        await this.notificacoes.markFailed(notificacao.id, error as Error);
        await this.auditLogs.create({
          event: AuditEvent.NOTIFICATION_FAILED,
          ip: 'worker',
          userAgent: 'bullmq',
          metadata: {
            notificacaoId: notificacao.id,
            clinicaId: notificacao.clinicaId,
            destinatarioId: notificacao.destinatarioId,
            canal: notificacao.canal,
            tipo: notificacao.tipo,
            erro: error instanceof Error ? error.message : String(error),
          },
        });
      } else {
        await this.notificacoes.recordAttempt(notificacao.id, error as Error);
      }

      throw error;
    }
  }
}
