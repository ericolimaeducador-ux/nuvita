import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TelemedicinaService } from './application/telemedicina.service';
import { SALA_TELEMEDICINA_REPOSITORY } from './telemedicina.constants';
import { SalaTelemedicinaMongoRepository } from './infrastructure/mongo/sala-telemedicina-mongo.repository';
import { SalaTelemedicinaMongo, SalaTelemedicinaSchema } from './infrastructure/mongo/sala-telemedicina.schema';
import { TelemedicinaController } from './presentation/telemedicina.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SalaTelemedicinaMongo.name, schema: SalaTelemedicinaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [TelemedicinaController],
  providers: [
    TelemedicinaService,
    JwtAuthGuard,
    RolesGuard,
    { provide: SALA_TELEMEDICINA_REPOSITORY, useClass: SalaTelemedicinaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [TelemedicinaService],
})
export class TelemedicinaModule {}
