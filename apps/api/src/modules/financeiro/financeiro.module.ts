import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { FinanceiroService } from './application/financeiro.service';
import { LANCAMENTO_REPOSITORY } from './financeiro.constants';
import { LancamentoMongoRepository } from './infrastructure/mongo/lancamento-mongo.repository';
import { LancamentoMongo, LancamentoSchema } from './infrastructure/mongo/lancamento.schema';
import { FinanceiroController } from './presentation/financeiro.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: LancamentoMongo.name, schema: LancamentoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [FinanceiroController],
  providers: [
    FinanceiroService,
    JwtAuthGuard,
    RolesGuard,
    { provide: LANCAMENTO_REPOSITORY, useClass: LancamentoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
