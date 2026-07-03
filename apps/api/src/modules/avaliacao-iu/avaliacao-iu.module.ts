import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AvaliacaoIUService } from './application/avaliacao-iu.service';
import { AvaliacaoIUMongoRepository } from './infrastructure/mongo/avaliacao-iu-mongo.repository';
import { AvaliacaoIUMongo, AvaliacaoIUSchema } from './infrastructure/mongo/avaliacao-iu.schema';
import { AVALIACAO_IU_REPOSITORY } from './avaliacao-iu.constants';
import { AvaliacaoIUController } from './presentation/avaliacao-iu.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AvaliacaoIUMongo.name, schema: AvaliacaoIUSchema }]),
    PacientesModule,
  ],
  controllers: [AvaliacaoIUController],
  providers: [
    AvaliacaoIUService,
    JwtAuthGuard,
    RolesGuard,
    { provide: AVALIACAO_IU_REPOSITORY, useClass: AvaliacaoIUMongoRepository },
  ],
  exports: [AvaliacaoIUService],
})
export class AvaliacaoIUModule {}
