import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacaoDispatcherService } from './application/notificacao-dispatcher.service';
import { NotificacaoWindowService } from './application/notificacao-window.service';
import { NotificacoesService } from './application/notificacoes.service';
import { NotificacaoTemplateService } from './application/templates/notificacao-template.service';
import { BullMqNotificacaoQueueService } from './infrastructure/queue/bullmq-notificacao-queue.service';
import { notificacaoQueueProvider } from './infrastructure/queue/notificacao-queue.provider';
import { NotificacaoWorker } from './infrastructure/queue/notificacao.worker';
import { EmailSender } from './infrastructure/senders/email.sender';
import { SmsSender } from './infrastructure/senders/sms.sender';
import { WhatsAppSender } from './infrastructure/senders/whatsapp.sender';
import {
  NotificacaoMongoRepository,
  NotificacaoPreferenciaMongoRepository,
} from './infrastructure/mongo/notificacao-mongo.repository';
import {
  NotificacaoMongo,
  NotificacaoPreferenciaMongo,
  NotificacaoPreferenciaSchema,
  NotificacaoSchema,
} from './infrastructure/mongo/notificacao.schema';
import {
  NOTIFICACAO_PREFERENCIA_REPOSITORY,
  NOTIFICACAO_REPOSITORY,
} from './notificacoes.constants';
import { NotificacoesController } from './presentation/notificacoes.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: NotificacaoMongo.name, schema: NotificacaoSchema },
      { name: NotificacaoPreferenciaMongo.name, schema: NotificacaoPreferenciaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    NotificacaoTemplateService,
    NotificacaoWindowService,
    NotificacaoDispatcherService,
    BullMqNotificacaoQueueService,
    NotificacaoWorker,
    EmailSender,
    WhatsAppSender,
    SmsSender,
    JwtAuthGuard,
    RolesGuard,
    notificacaoQueueProvider,
    { provide: 'NOTIFICACAO_QUEUE_SERVICE', useExisting: BullMqNotificacaoQueueService },
    { provide: 'NOTIFICACAO_SENDERS', useFactory: (email: EmailSender, whatsapp: WhatsAppSender, sms: SmsSender) => [email, whatsapp, sms], inject: [EmailSender, WhatsAppSender, SmsSender] },
    { provide: NOTIFICACAO_REPOSITORY, useClass: NotificacaoMongoRepository },
    { provide: NOTIFICACAO_PREFERENCIA_REPOSITORY, useClass: NotificacaoPreferenciaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
