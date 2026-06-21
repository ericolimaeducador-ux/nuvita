import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityModule } from './common/security/security.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { AppConfigService } from './common/security/config.service';
import { AgendamentosModule } from './modules/agendamentos/agendamentos.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ClinicasModule } from './modules/clinicas/clinicas.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { ProntuariosModule } from './modules/prontuarios/prontuarios.module';
import { TelemedicinaModule } from './modules/telemedicina/telemedicina.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { AvaliacaoIUModule } from './modules/avaliacao-iu/avaliacao-iu.module';
import { FollowUpModule } from './modules/followup/followup.module';
import { LaudoMedicoModule } from './modules/laudo-medico/laudo-medico.module';
import { ProcessoJuridicoModule } from './modules/processo-juridico/processo-juridico.module';
import { EntregasModule } from './modules/entregas/entregas.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SecurityModule,
    TenancyModule,
    MongooseModule.forRootAsync({
      imports: [SecurityModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.getConfig().mongodbUri,
      }),
    }),
    AuthModule,
    ClinicasModule,
    PacientesModule,
    ProntuariosModule,
    DocumentosModule,
    NotificacoesModule,
    AgendamentosModule,
    FinanceiroModule,
    TelemedicinaModule,
    AnalyticsModule,
    HealthModule,
    ProdutosModule,
    AvaliacaoIUModule,
    FollowUpModule,
    LaudoMedicoModule,
    ProcessoJuridicoModule,
    EntregasModule,
    SuperAdminModule,
  ],
})
export class AppModule {}
