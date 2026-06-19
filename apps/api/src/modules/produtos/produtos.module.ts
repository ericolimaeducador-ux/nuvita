import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { ProdutosService } from './application/produtos.service';
import { ProdutoMongoRepository } from './infrastructure/mongo/produto-mongo.repository';
import { ProdutoMongo, ProdutoSchema } from './infrastructure/mongo/produto.schema';
import { PRODUTO_REPOSITORY } from './produtos.constants';
import { ProdutosController } from './presentation/produtos.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProdutoMongo.name, schema: ProdutoSchema }])],
  controllers: [ProdutosController],
  providers: [
    ProdutosService,
    JwtAuthGuard,
    { provide: PRODUTO_REPOSITORY, useClass: ProdutoMongoRepository },
  ],
  exports: [ProdutosService],
})
export class ProdutosModule {}
