import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TestesPsicologicosService } from './application/testes-psicologicos.service';
import { TestePsicologicoMongoRepository } from './infrastructure/mongo/teste-psicologico-mongo.repository';
import { TestePsicologicoMongo, TestePsicologicoSchema } from './infrastructure/mongo/teste-psicologico.schema';
import { TESTE_PSICOLOGICO_REPOSITORY } from './testes-psicologicos.constants';
import { TestesPsicologicosController } from './presentation/testes-psicologicos.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TestePsicologicoMongo.name, schema: TestePsicologicoSchema }]),
  ],
  controllers: [TestesPsicologicosController],
  providers: [
    TestesPsicologicosService,
    JwtAuthGuard,
    RolesGuard,
    { provide: TESTE_PSICOLOGICO_REPOSITORY, useClass: TestePsicologicoMongoRepository },
  ],
  exports: [TestesPsicologicosService],
})
export class TestesPsicologicosModule {}
