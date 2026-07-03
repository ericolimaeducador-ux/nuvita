import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
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
    ]),
    PacientesModule,
  ],
  controllers: [AgendamentosController],
  providers: [
    AgendamentosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: AGENDAMENTO_REPOSITORY, useClass: AgendamentoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
