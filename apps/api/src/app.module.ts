import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalThrottlerGuard } from './common/http/global-throttler.guard';
import { SecurityModule } from './common/security/security.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { AppConfigService } from './common/security/config.service';
import { AgendamentosModule } from './modules/agendamentos/agendamentos.module';
import { LembretesAgendamentoModule } from './modules/lembretes-agendamento/lembretes-agendamento.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ClinicasModule } from './modules/clinicas/clinicas.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ProntuariosModule } from './modules/prontuarios/prontuarios.module';
import { TelemedicinaModule } from './modules/telemedicina/telemedicina.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { ObservacoesPacienteModule } from './modules/observacoes-paciente/observacoes-paciente.module';
import { TestesPsicologicosModule } from './modules/testes-psicologicos/testes-psicologicos.module';
import { IaClinicaModule } from './modules/ia-clinica/ia-clinica.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SecurityModule,
    TenancyModule,
    // Teto padrão de TODA rota da API (o GlobalThrottlerGuard abaixo é global).
    // 300/min = 5 req/s por IP: alto o bastante para não punir uma clínica
    // inteira atrás de um único IP de NAT, e baixo o bastante para conter
    // loop de retry no front ou abuso das rotas públicas. Rotas sensíveis ou
    // caras apertam bem abaixo disso com @Throttle() (auth: 5-10/min,
    // ia-clinica: 10/min).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    MongooseModule.forRootAsync({
      imports: [SecurityModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { mongodbUri, nodeEnv } = config.getConfig();
        return {
          uri: mongodbUri,
          // O default do Mongoose é autoIndex: true, inclusive em produção —
          // ele tenta construir todos os índices declarados nos schemas a cada
          // subida. Com as collections pequenas de hoje é inofensivo, mas
          // conforme pacientes/prontuarios crescerem isso estoura o timeout de
          // startup do Cloud Run e derruba o deploy. Fora de dev os índices
          // passam a ser responsabilidade de migração/ops.
          autoIndex: nodeEnv === 'development',
        };
      },
    }),
    AuthModule,
    ClinicasModule,
    PacientesModule,
    TicketsModule,
    ProntuariosModule,
    DocumentosModule,
    NotificacoesModule,
    AgendamentosModule,
    LembretesAgendamentoModule,
    FinanceiroModule,
    TelemedicinaModule,
    AnalyticsModule,
    HealthModule,
    SuperAdminModule,
    ObservacoesPacienteModule,
    TestesPsicologicosModule,
    IaClinicaModule,
  ],
  providers: [
    // Throttling global. Sem isso o ThrottlerModule acima só valeria onde um
    // guard fosse declarado à mão — era o caso até aqui, e deixava as rotas
    // públicas de telemedicina/acesso sem limite nenhum.
    { provide: APP_GUARD, useClass: GlobalThrottlerGuard },
  ],
})
export class AppModule {}
