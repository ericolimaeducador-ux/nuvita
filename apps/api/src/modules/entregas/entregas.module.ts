import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { ProcessoJuridicoModule } from '../processo-juridico/processo-juridico.module';
import { EntregasService } from './application/entregas.service';
import { EntregaMongoRepository } from './infrastructure/mongo/entrega-mongo.repository';
import { EntregaMongo, EntregaSchema } from './infrastructure/mongo/entrega.schema';
import { ENTREGA_REPOSITORY } from './entregas.constants';
import { EntregasController } from './presentation/entregas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EntregaMongo.name, schema: EntregaSchema }]),
    PacientesModule,
    ProcessoJuridicoModule,
  ],
  controllers: [EntregasController],
  providers: [
    EntregasService,
    JwtAuthGuard,
    RolesGuard,
    { provide: ENTREGA_REPOSITORY, useClass: EntregaMongoRepository },
  ],
  exports: [EntregasService],
})
export class EntregasModule {}
