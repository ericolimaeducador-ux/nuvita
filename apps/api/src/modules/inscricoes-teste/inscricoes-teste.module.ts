import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { EmailSender } from '../notificacoes/infrastructure/senders/email.sender';
import { InscricoesTesteMailer } from './application/inscricoes-teste.mailer';
import { InscricoesTesteService } from './application/inscricoes-teste.service';
import { InscricaoTesteMongoRepository } from './infrastructure/mongo/inscricao-teste-mongo.repository';
import { InscricaoTesteMongo, InscricaoTesteSchema } from './infrastructure/mongo/inscricao-teste.schema';
import { INSCRICAO_TESTE_REPOSITORY } from './inscricoes-teste.constants';
import { InscricoesTesteController } from './presentation/inscricoes-teste.controller';

@Module({
  imports: [ConfigModule, MongooseModule.forFeature([{ name: InscricaoTesteMongo.name, schema: InscricaoTesteSchema }])],
  controllers: [InscricoesTesteController],
  providers: [
    InscricoesTesteService,
    InscricoesTesteMailer,
    // Mesmo remetente (Resend/SendGrid) do módulo de notificações; AppConfigService vem do SecurityModule (global).
    EmailSender,
    JwtAuthGuard,
    RolesGuard,
    { provide: INSCRICAO_TESTE_REPOSITORY, useClass: InscricaoTesteMongoRepository },
  ],
})
export class InscricoesTesteModule {}
