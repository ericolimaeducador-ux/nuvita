import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AvaliacaoIUModule } from '../avaliacao-iu/avaliacao-iu.module';
import { ProntuariosModule } from '../prontuarios/prontuarios.module';
import { FollowUpModule } from '../followup/followup.module';
import { ObservacoesPacienteModule } from '../observacoes-paciente/observacoes-paciente.module';
import { ProcessoJuridicoModule } from '../processo-juridico/processo-juridico.module';
import { AnotacoesJuridicasModule } from '../anotacoes-juridicas/anotacoes-juridicas.module';
import { LaudoMedicoService } from './application/laudo-medico.service';
import { LaudoMedicoIaService } from './application/laudo-medico-ia.service';
import { LaudoMedicoMongoRepository } from './infrastructure/mongo/laudo-medico-mongo.repository';
import { LaudoMedicoMongo, LaudoMedicoSchema } from './infrastructure/mongo/laudo-medico.schema';
import { GeminiTextGeneratorService } from './infrastructure/ai/gemini-text-generator.service';
import { AI_TEXT_GENERATOR, LAUDO_MEDICO_REPOSITORY } from './laudo-medico.constants';
import { LaudoMedicoController } from './presentation/laudo-medico.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LaudoMedicoMongo.name, schema: LaudoMedicoSchema }]),
    PacientesModule,
    AvaliacaoIUModule,
    ProntuariosModule,
    FollowUpModule,
    ObservacoesPacienteModule,
    ProcessoJuridicoModule,
    AnotacoesJuridicasModule,
  ],
  controllers: [LaudoMedicoController],
  providers: [
    LaudoMedicoService,
    LaudoMedicoIaService,
    JwtAuthGuard,
    RolesGuard,
    { provide: LAUDO_MEDICO_REPOSITORY, useClass: LaudoMedicoMongoRepository },
    { provide: AI_TEXT_GENERATOR, useClass: GeminiTextGeneratorService },
  ],
  exports: [LaudoMedicoService],
})
export class LaudoMedicoModule {}
