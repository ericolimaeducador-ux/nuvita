import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { AvaliacaoIUModule } from '../avaliacao-iu/avaliacao-iu.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ProdutosModule } from '../produtos/produtos.module';
import { EntregasService } from './application/entregas.service';
import { EntregaMongoRepository } from './infrastructure/mongo/entrega-mongo.repository';
import { EntregaMongo, EntregaSchema } from './infrastructure/mongo/entrega.schema';
import { ENTREGA_REPOSITORY } from './entregas.constants';
import { EntregasController } from './presentation/entregas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EntregaMongo.name, schema: EntregaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
    PacientesModule,
    ProdutosModule,
    AvaliacaoIUModule,
  ],
  controllers: [EntregasController],
  providers: [
    EntregasService,
    JwtAuthGuard,
    RolesGuard,
    { provide: ENTREGA_REPOSITORY, useClass: EntregaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [EntregasService],
})
export class EntregasModule {}
