import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AgendamentosModule } from '../agendamentos/agendamentos.module';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { UserMongoRepository } from '../auth/infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from '../auth/infrastructure/mongo/user.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { ClinicasModule } from '../clinicas/clinicas.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { DocumentosEmitidosService } from './application/documentos-emitidos.service';
import { DOCUMENTO_EMITIDO_REPOSITORY } from './documentos-emitidos.constants';
import { DocumentoEmitidoMongoRepository } from './infrastructure/mongo/documento-emitido-mongo.repository';
import { DocumentoEmitidoMongo, DocumentoEmitidoSchema } from './infrastructure/mongo/documento-emitido.schema';
import { DocumentosEmitidosController } from './presentation/documentos-emitidos.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: DocumentoEmitidoMongo.name, schema: DocumentoEmitidoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
      { name: UserMongo.name, schema: UserSchema },
    ]),
    AgendamentosModule,
    PacientesModule,
    ClinicasModule,
  ],
  controllers: [DocumentosEmitidosController],
  providers: [
    DocumentosEmitidosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: DOCUMENTO_EMITIDO_REPOSITORY, useClass: DocumentoEmitidoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
})
export class DocumentosEmitidosModule {}
