import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { ObservacoesPacienteService } from './application/observacoes-paciente.service';
import { ObservacaoPacienteMongoRepository } from './infrastructure/mongo/observacao-paciente-mongo.repository';
import { ObservacaoPacienteMongo, ObservacaoPacienteSchema } from './infrastructure/mongo/observacao-paciente.schema';
import { OBSERVACAO_PACIENTE_REPOSITORY } from './observacoes-paciente.constants';
import { ObservacoesPacienteController } from './presentation/observacoes-paciente.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ObservacaoPacienteMongo.name, schema: ObservacaoPacienteSchema }]),
  ],
  controllers: [ObservacoesPacienteController],
  providers: [
    ObservacoesPacienteService,
    JwtAuthGuard,
    RolesGuard,
    { provide: OBSERVACAO_PACIENTE_REPOSITORY, useClass: ObservacaoPacienteMongoRepository },
  ],
})
export class ObservacoesPacienteModule {}
