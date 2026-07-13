import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ProntuariosModule } from '../prontuarios/prontuarios.module';
import { FinanceiroService } from './application/financeiro.service';
import { PsicologiaFinanceiroService } from './application/psicologia-financeiro.service';
import { CONFIG_PSICOLOGO_REPOSITORY, LANCAMENTO_REPOSITORY } from './financeiro.constants';
import { ConfigPsicologoMongoRepository } from './infrastructure/mongo/config-psicologo-mongo.repository';
import { ConfigPsicologoMongo, ConfigPsicologoSchema } from './infrastructure/mongo/config-psicologo.schema';
import { LancamentoMongoRepository } from './infrastructure/mongo/lancamento-mongo.repository';
import { LancamentoMongo, LancamentoSchema } from './infrastructure/mongo/lancamento.schema';
import { FinanceiroController } from './presentation/financeiro.controller';
import { PsicologiaFinanceiroController } from './presentation/psicologia-financeiro.controller';

@Module({
  imports: [
    ConfigModule,
    // O painel do psicólogo conta as sessões pelos prontuários e resolve os
    // nomes dos pacientes — daí os dois módulos.
    ProntuariosModule,
    PacientesModule,
    MongooseModule.forFeature([
      { name: LancamentoMongo.name, schema: LancamentoSchema },
      { name: ConfigPsicologoMongo.name, schema: ConfigPsicologoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [FinanceiroController, PsicologiaFinanceiroController],
  providers: [
    FinanceiroService,
    PsicologiaFinanceiroService,
    JwtAuthGuard,
    RolesGuard,
    { provide: LANCAMENTO_REPOSITORY, useClass: LancamentoMongoRepository },
    { provide: CONFIG_PSICOLOGO_REPOSITORY, useClass: ConfigPsicologoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
