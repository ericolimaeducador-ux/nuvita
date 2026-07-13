import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { AgendamentosModule } from '../agendamentos/agendamentos.module';
import { ProntuariosService } from './application/prontuarios.service';
import {
  Cid10MongoRepository,
  ProntuarioMongoRepository,
} from './infrastructure/mongo/prontuario-mongo.repository';
import {
  Cid10Mongo,
  Cid10Schema,
  ProntuarioAddendumMongo,
  ProntuarioAddendumSchema,
  ProntuarioMongo,
  ProntuarioSchema,
} from './infrastructure/mongo/prontuario.schema';
import { CID10_REPOSITORY, PRONTUARIO_REPOSITORY } from './prontuarios.constants';
import { ProntuariosController } from './presentation/prontuarios.controller';

@Module({
  imports: [
    ConfigModule,
    AgendamentosModule,
    MongooseModule.forFeature([
      { name: ProntuarioMongo.name, schema: ProntuarioSchema },
      { name: ProntuarioAddendumMongo.name, schema: ProntuarioAddendumSchema },
      { name: Cid10Mongo.name, schema: Cid10Schema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ProntuariosController],
  providers: [
    ProntuariosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: PRONTUARIO_REPOSITORY, useClass: ProntuarioMongoRepository },
    { provide: CID10_REPOSITORY, useClass: Cid10MongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  // O repositório sai do módulo porque o financeiro do psicólogo conta as
  // sessões pelos prontuários de psicoterapia.
  exports: [ProntuariosService, PRONTUARIO_REPOSITORY],
})
export class ProntuariosModule {}
