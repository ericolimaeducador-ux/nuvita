import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicasModule } from './modules/clinicas/clinicas.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { ProntuariosModule } from './modules/prontuarios/prontuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    ClinicasModule,
    PacientesModule,
    ProntuariosModule,
    DocumentosModule,
    NotificacoesModule,
  ],
})
export class AppModule {}
