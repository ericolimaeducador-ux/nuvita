import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { ProdutosService } from './application/produtos.service';
import { ProdutoMongoRepository } from './infrastructure/mongo/produto-mongo.repository';
import { ProdutoMongo, ProdutoSchema } from './infrastructure/mongo/produto.schema';
import { PRODUTO_REPOSITORY } from './produtos.constants';
import { ProdutosController } from './presentation/produtos.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProdutoMongo.name, schema: ProdutoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ProdutosController],
  providers: [
    ProdutosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: PRODUTO_REPOSITORY, useClass: ProdutoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [ProdutosService],
})
export class ProdutosModule {}
