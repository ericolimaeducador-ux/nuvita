import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { CobrancasService } from './application/cobrancas.service';
import { COBRANCA_REPOSITORY, FINANCEIRO_CONFIG_REPOSITORY } from './cobrancas.constants';
import { CobrancaMongoRepository } from './infrastructure/mongo/cobranca-mongo.repository';
import { CobrancaMongo, CobrancaSchema } from './infrastructure/mongo/cobranca.schema';
import { FinanceiroConfigMongoRepository } from './infrastructure/mongo/financeiro-config-mongo.repository';
import { FinanceiroConfigMongo, FinanceiroConfigSchema } from './infrastructure/mongo/financeiro-config.schema';
import { CobrancasController } from './presentation/cobrancas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CobrancaMongo.name, schema: CobrancaSchema },
      { name: FinanceiroConfigMongo.name, schema: FinanceiroConfigSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
    NotificacoesModule,
    PacientesModule,
  ],
  controllers: [CobrancasController],
  providers: [
    CobrancasService,
    JwtAuthGuard,
    RolesGuard,
    { provide: COBRANCA_REPOSITORY, useClass: CobrancaMongoRepository },
    { provide: FINANCEIRO_CONFIG_REPOSITORY, useClass: FinanceiroConfigMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [CobrancasService],
})
export class CobrancasModule {}
