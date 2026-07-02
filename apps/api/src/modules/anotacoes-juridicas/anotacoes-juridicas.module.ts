import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { AnotacoesJuridicasService } from './application/anotacoes-juridicas.service';
import { AnotacaoJuridicaMongoRepository } from './infrastructure/mongo/anotacao-juridica-mongo.repository';
import { AnotacaoJuridicaMongo, AnotacaoJuridicaSchema } from './infrastructure/mongo/anotacao-juridica.schema';
import { ANOTACAO_JURIDICA_REPOSITORY } from './anotacoes-juridicas.constants';
import { AnotacoesJuridicasController } from './presentation/anotacoes-juridicas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AnotacaoJuridicaMongo.name, schema: AnotacaoJuridicaSchema }]),
  ],
  controllers: [AnotacoesJuridicasController],
  providers: [
    AnotacoesJuridicasService,
    JwtAuthGuard,
    RolesGuard,
    { provide: ANOTACAO_JURIDICA_REPOSITORY, useClass: AnotacaoJuridicaMongoRepository },
  ],
})
export class AnotacoesJuridicasModule {}
