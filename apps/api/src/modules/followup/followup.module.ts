import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { FollowUpService } from './application/followup.service';
import { FollowUpMongoRepository } from './infrastructure/mongo/followup-mongo.repository';
import { FollowUpMongo, FollowUpSchema } from './infrastructure/mongo/followup.schema';
import { FOLLOWUP_REPOSITORY } from './followup.constants';
import { FollowUpController } from './presentation/followup.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowUpMongo.name, schema: FollowUpSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
    NotificacoesModule,
    PacientesModule,
  ],
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    JwtAuthGuard,
    RolesGuard,
    { provide: FOLLOWUP_REPOSITORY, useClass: FollowUpMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [FollowUpService],
})
export class FollowUpModule {}
