import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ProcessoJuridicoService } from './application/processo-juridico.service';
import { ProcessoJuridicoMongoRepository } from './infrastructure/mongo/processo-juridico-mongo.repository';
import { ProcessoJuridicoMongo, ProcessoJuridicoSchema } from './infrastructure/mongo/processo-juridico.schema';
import { PROCESSO_JURIDICO_REPOSITORY } from './processo-juridico.constants';
import { ProcessoJuridicoController } from './presentation/processo-juridico.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProcessoJuridicoMongo.name, schema: ProcessoJuridicoSchema }]),
    PacientesModule,
  ],
  controllers: [ProcessoJuridicoController],
  providers: [
    ProcessoJuridicoService,
    JwtAuthGuard,
    RolesGuard,
    { provide: PROCESSO_JURIDICO_REPOSITORY, useClass: ProcessoJuridicoMongoRepository },
  ],
  exports: [ProcessoJuridicoService],
})
export class ProcessoJuridicoModule {}
