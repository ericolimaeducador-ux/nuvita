import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { UserMongoRepository } from '../auth/infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from '../auth/infrastructure/mongo/user.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AgendamentosService } from './application/agendamentos.service';
import { AGENDAMENTO_REPOSITORY } from './agendamentos.constants';
import { AgendamentoMongoRepository } from './infrastructure/mongo/agendamento-mongo.repository';
import {
  AgendamentoMongo,
  AgendamentoSchema,
  BloqueioAgendaMongo,
  BloqueioAgendaSchema,
} from './infrastructure/mongo/agendamento.schema';
import { AgendamentosController } from './presentation/agendamentos.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AgendamentoMongo.name, schema: AgendamentoSchema },
      { name: BloqueioAgendaMongo.name, schema: BloqueioAgendaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
      { name: UserMongo.name, schema: UserSchema },
    ]),
    PacientesModule,
    NotificacoesModule,
  ],
  controllers: [AgendamentosController],
  providers: [
    AgendamentosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: AGENDAMENTO_REPOSITORY, useClass: AgendamentoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
