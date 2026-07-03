import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { LaudoMedicoService } from './application/laudo-medico.service';
import { LaudoMedicoMongoRepository } from './infrastructure/mongo/laudo-medico-mongo.repository';
import { LaudoMedicoMongo, LaudoMedicoSchema } from './infrastructure/mongo/laudo-medico.schema';
import { LAUDO_MEDICO_REPOSITORY } from './laudo-medico.constants';
import { LaudoMedicoController } from './presentation/laudo-medico.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: LaudoMedicoMongo.name, schema: LaudoMedicoSchema }]), PacientesModule],
  controllers: [LaudoMedicoController],
  providers: [
    LaudoMedicoService,
    JwtAuthGuard,
    RolesGuard,
    { provide: LAUDO_MEDICO_REPOSITORY, useClass: LaudoMedicoMongoRepository },
  ],
  exports: [LaudoMedicoService],
})
export class LaudoMedicoModule {}
