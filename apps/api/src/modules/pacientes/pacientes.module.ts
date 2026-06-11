import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesService } from './application/pacientes.service';
import { PacienteCryptoService } from './infrastructure/crypto/paciente-crypto.service';
import { PacienteMongoRepository } from './infrastructure/mongo/paciente-mongo.repository';
import { PacienteMongo, PacienteSchema } from './infrastructure/mongo/paciente.schema';
import { PACIENTE_REPOSITORY } from './pacientes.constants';
import { PacientesController } from './presentation/pacientes.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PacienteMongo.name, schema: PacienteSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [PacientesController],
  providers: [
    PacientesService,
    PacienteCryptoService,
    JwtAuthGuard,
    RolesGuard,
    { provide: PACIENTE_REPOSITORY, useClass: PacienteMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [PacientesService],
})
export class PacientesModule {}
