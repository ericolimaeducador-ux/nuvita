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
import { CobrancasModule } from '../cobrancas/cobrancas.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ConsultasService } from './application/consultas.service';
import { CONSULTA_REPOSITORY } from './consultas.constants';
import { ModulosAvaliacaoRegistry } from './domain/modulos-avaliacao.registry';
import { ConsultaMongoRepository } from './infrastructure/mongo/consulta-mongo.repository';
import {
  AdendoConsultaMongo,
  AdendoConsultaSchema,
  ConsultaMongo,
  ConsultaSchema,
} from './infrastructure/mongo/consulta.schema';
import { ConsultasController } from './presentation/consultas.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ConsultaMongo.name, schema: ConsultaSchema },
      { name: AdendoConsultaMongo.name, schema: AdendoConsultaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
      { name: UserMongo.name, schema: UserSchema },
    ]),
    PacientesModule,
    CobrancasModule,
  ],
  controllers: [ConsultasController],
  providers: [
    ConsultasService,
    JwtAuthGuard,
    RolesGuard,
    // Módulos da Avaliação (IU, incontinência anal, ferida, ostomia) entram nas etapas 5b–5d; nesta etapa, nenhum.
    { provide: ModulosAvaliacaoRegistry, useFactory: () => new ModulosAvaliacaoRegistry([]) },
    { provide: CONSULTA_REPOSITORY, useClass: ConsultaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
  exports: [ConsultasService],
})
export class ConsultasModule {}
