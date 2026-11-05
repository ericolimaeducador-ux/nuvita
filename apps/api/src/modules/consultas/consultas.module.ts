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
import { AreaModuloAvaliacao, VALIDADORES_MODULO } from '../../../../../packages/shared/src/consulta';
import { S3DocumentStorageService } from '../documentos/infrastructure/storage/s3-document-storage.service';
import { ModulosAvaliacaoRegistry } from './domain/modulos-avaliacao.registry';
import { CONSULTA_ANEXO_STORAGE } from './consultas.constants';
import { ConsultaMongoRepository } from './infrastructure/mongo/consulta-mongo.repository';
import {
  AdendoConsultaMongo,
  AdendoConsultaSchema,
  AnexoConsultaMongo,
  AnexoConsultaSchema,
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
      { name: AnexoConsultaMongo.name, schema: AnexoConsultaSchema },
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
    // Módulos da Avaliação com conteúdo: IU e incontinência anal (5b). Ferida (5c) e ostomia (5d) ainda sem módulo.
    {
      provide: ModulosAvaliacaoRegistry,
      useFactory: () =>
        new ModulosAvaliacaoRegistry(
          (Object.entries(VALIDADORES_MODULO) as Array<[AreaModuloAvaliacao, (d: unknown) => string[]]>).map(([area, validar]) => ({ area, validar })),
        ),
    },
    // Anexos da consulta: SÓ o storage R2 do módulo documentos é reaproveitado (o módulo documentos não é alterado).
    S3DocumentStorageService,
    { provide: CONSULTA_ANEXO_STORAGE, useExisting: S3DocumentStorageService },
    { provide: CONSULTA_REPOSITORY, useClass: ConsultaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
  exports: [ConsultasService],
})
export class ConsultasModule {}
