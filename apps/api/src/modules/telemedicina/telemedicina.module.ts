import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TelemedicinaService } from './application/telemedicina.service';
import {
  SALA_EVENTO_REPOSITORY,
  SALA_TELEMEDICINA_REPOSITORY,
  SINAL_SALA_REPOSITORY,
} from './telemedicina.constants';
import { SalaTelemedicinaMongoRepository } from './infrastructure/mongo/sala-telemedicina-mongo.repository';
import { SalaTelemedicinaMongo, SalaTelemedicinaSchema } from './infrastructure/mongo/sala-telemedicina.schema';
import { SalaEventoMongoRepository } from './infrastructure/mongo/sala-evento-mongo.repository';
import { SalaEventoMongo, SalaEventoSchema } from './infrastructure/mongo/sala-evento.schema';
import { SinalSalaMongoRepository } from './infrastructure/mongo/sinal-sala-mongo.repository';
import { SinalSalaMongo, SinalSalaSchema } from './infrastructure/mongo/sinal-sala.schema';
import { TelemedicinaController } from './presentation/telemedicina.controller';
import { TelemedicinaAcessoController } from './presentation/telemedicina-acesso.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SalaTelemedicinaMongo.name, schema: SalaTelemedicinaSchema },
      { name: SalaEventoMongo.name, schema: SalaEventoSchema },
      { name: SinalSalaMongo.name, schema: SinalSalaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [TelemedicinaController, TelemedicinaAcessoController],
  providers: [
    TelemedicinaService,
    JwtAuthGuard,
    RolesGuard,
    { provide: SALA_TELEMEDICINA_REPOSITORY, useClass: SalaTelemedicinaMongoRepository },
    { provide: SALA_EVENTO_REPOSITORY, useClass: SalaEventoMongoRepository },
    { provide: SINAL_SALA_REPOSITORY, useClass: SinalSalaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [TelemedicinaService],
})
export class TelemedicinaModule {}
