import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ChecklistDocumentosService } from './application/checklist-documentos.service';
import { ChecklistDocumentoMongoRepository } from './infrastructure/mongo/checklist-documento-mongo.repository';
import { ChecklistDocumentoMongo, ChecklistDocumentoSchema } from './infrastructure/mongo/checklist-documento.schema';
import { CHECKLIST_DOCUMENTO_REPOSITORY } from './checklist-documentos.constants';
import { ChecklistDocumentosController } from './presentation/checklist-documentos.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ChecklistDocumentoMongo.name, schema: ChecklistDocumentoSchema }]),
    PacientesModule,
  ],
  controllers: [ChecklistDocumentosController],
  providers: [
    ChecklistDocumentosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: CHECKLIST_DOCUMENTO_REPOSITORY, useClass: ChecklistDocumentoMongoRepository },
  ],
})
export class ChecklistDocumentosModule {}
