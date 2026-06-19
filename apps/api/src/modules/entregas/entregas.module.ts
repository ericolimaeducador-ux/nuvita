import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { EntregasService } from './application/entregas.service';
import { EntregaMongoRepository } from './infrastructure/mongo/entrega-mongo.repository';
import { EntregaMongo, EntregaSchema } from './infrastructure/mongo/entrega.schema';
import { ENTREGA_REPOSITORY } from './entregas.constants';
import { EntregasController } from './presentation/entregas.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: EntregaMongo.name, schema: EntregaSchema }])],
  controllers: [EntregasController],
  providers: [
    EntregasService,
    JwtAuthGuard,
    { provide: ENTREGA_REPOSITORY, useClass: EntregaMongoRepository },
  ],
  exports: [EntregasService],
})
export class EntregasModule {}
