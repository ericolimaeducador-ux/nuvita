import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OAuth2Client } from 'google-auth-library';
import { AGENDAMENTO_REPOSITORY } from '../agendamentos/agendamentos.constants';
import { AgendamentoMongoRepository } from '../agendamentos/infrastructure/mongo/agendamento-mongo.repository';
import {
  AgendamentoMongo,
  AgendamentoSchema,
  BloqueioAgendaMongo,
  BloqueioAgendaSchema,
} from '../agendamentos/infrastructure/mongo/agendamento.schema';
import { USER_REPOSITORY } from '../auth/auth.constants';
import { UserMongoRepository } from '../auth/infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from '../auth/infrastructure/mongo/user.schema';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { LembretesAgendamentoProcessorService } from './application/lembretes-agendamento-processor.service';
import { OidcSchedulerGuardAdapter } from './presentation/guards/oidc-scheduler-guard.adapter';
import { LembretesAgendamentoController } from './presentation/lembretes-agendamento.controller';

/**
 * feature-consultation-reminder-scheduler. OAuth2Client é um provider
 * comum (não referenciado por nenhum decorator) — sem ambiguidade de
 * resolução. OidcSchedulerGuardAdapter é quem entra em @UseGuards() no
 * controller; ver comentário no próprio adapter sobre por quê o guard
 * real (OidcSchedulerGuard) não pode ser referenciado diretamente ali.
 *
 * AGENDAMENTO_REPOSITORY/USER_REPOSITORY são registrados aqui (mesmo
 * padrão de agendamentos.module.ts) porque LembretesAgendamentoProcessorService
 * precisa deles diretamente — não importa AgendamentosModule (que só
 * exporta AgendamentosService, não o token do repositório).
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AgendamentoMongo.name, schema: AgendamentoSchema },
      { name: BloqueioAgendaMongo.name, schema: BloqueioAgendaSchema },
      { name: UserMongo.name, schema: UserSchema },
    ]),
    PacientesModule,
    NotificacoesModule,
  ],
  controllers: [LembretesAgendamentoController],
  providers: [
    { provide: OAuth2Client, useValue: new OAuth2Client() },
    OidcSchedulerGuardAdapter,
    LembretesAgendamentoProcessorService,
    { provide: AGENDAMENTO_REPOSITORY, useClass: AgendamentoMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
  ],
})
export class LembretesAgendamentoModule {}
