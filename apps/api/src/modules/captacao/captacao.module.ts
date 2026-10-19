import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { CaptacaoService } from './application/captacao.service';
import {
  CapitacaoPacienteMongo,
  CapitacaoPacienteSchema,
} from './infrastructure/mongo/capitacao-paciente.schema';
import { CaptacaoController } from './presentation/captacao.controller';
import { CaptadorPinGuard } from './presentation/captador-pin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CapitacaoPacienteMongo.name, schema: CapitacaoPacienteSchema },
    ]),
    PacientesModule,
  ],
  controllers: [CaptacaoController],
  providers: [CaptacaoService, CaptadorPinGuard, JwtAuthGuard, RolesGuard],
})
export class CaptacaoModule {}
