import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { DocumentosService } from './application/documentos.service';
import { DocumentoMongoRepository } from './infrastructure/mongo/documento-mongo.repository';
import { DocumentoMongo, DocumentoSchema } from './infrastructure/mongo/documento.schema';
import { S3DocumentStorageService } from './infrastructure/storage/s3-document-storage.service';
import { DOCUMENTO_REPOSITORY } from './documentos.constants';
import { DocumentosController } from './presentation/documentos.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: DocumentoMongo.name, schema: DocumentoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [DocumentosController],
  providers: [
    DocumentosService,
    S3DocumentStorageService,
    JwtAuthGuard,
    RolesGuard,
    { provide: 'DOCUMENT_STORAGE', useExisting: S3DocumentStorageService },
    { provide: DOCUMENTO_REPOSITORY, useClass: DocumentoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [DocumentosService],
})
export class DocumentosModule {}
