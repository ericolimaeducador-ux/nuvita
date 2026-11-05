import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CanalNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { EmailSender } from '../../notificacoes/infrastructure/senders/email.sender';
import { InscricaoTeste } from '../domain/inscricao-teste.entity';

/**
 * E-mails da inscrição no teste beta, pelo mesmo EmailSender (Resend/SendGrid) do módulo
 * de notificações. Falha de e-mail NUNCA derruba a inscrição: a inscrição já está salva
 * e aparece na listagem do SUPER_ADMIN. Logs sem dado pessoal.
 */
/** Endereço que recebe as respostas das candidatas (Reply-To da confirmação). */
const RESPOSTA_PADRAO = 'contato@nuvita.app.br';

@Injectable()
export class InscricoesTesteMailer {
  private readonly logger = new Logger(InscricoesTesteMailer.name);

  constructor(
    private readonly email: EmailSender,
    private readonly config: ConfigService,
  ) {}

  async avisarEquipe(inscricao: InscricaoTeste): Promise<void> {
    const destino = this.config.get<string>('INSCRICOES_TESTE_EMAIL_AVISO');
    if (!destino) {
      this.logger.warn('INSCRICOES_TESTE_EMAIL_AVISO não configurado: aviso à equipe não enviado.');
      return;
    }
    await this.enviar({
      destino,
      // Responder ao aviso interno responde direto à candidata.
      responderPara: inscricao.email,
      assunto: 'Nova inscrição - Teste Nuvita Psi (15 dias)',
      mensagem: [
        'Nova inscrição recebida.',
        '',
        `Nome: ${inscricao.nome}`,
        `E-mail: ${inscricao.email}`,
        `WhatsApp: ${inscricao.whatsapp}`,
        `CRP: ${inscricao.crpNumero}`,
        `Cidade/UF: ${inscricao.cidadeEstado}`,
        `Atendimento: ${inscricao.modoAtendimento}`,
        `Usa hoje: ${inscricao.ferramentaAtual || '-'}`,
        `Maior dor: ${inscricao.maiorDor || '-'}`,
        '',
        `Aceite do termo: versão ${inscricao.termoVersao} em ${inscricao.aceiteTermoEm.toISOString()}`,
        '',
        'Decida quem entra pela listagem de inscrições do painel de super-admin.',
      ].join('\n'),
    });
  }

  async confirmarRecebimento(inscricao: InscricaoTeste): Promise<void> {
    await this.enviar({
      destino: inscricao.email,
      responderPara: this.config.get<string>('INSCRICOES_TESTE_EMAIL_RESPOSTA') || RESPOSTA_PADRAO,
      assunto: 'Recebemos sua inscrição no teste do Nuvita Psi',
      mensagem: [
        `Olá, ${inscricao.nome.split(' ')[0]}!`,
        '',
        'Recebemos sua inscrição para o teste de 15 dias do Nuvita Psi.',
        'Este e-mail confirma o recebimento. Ele ainda não garante a vaga: são 25 vagas, e quem passar disso entra na lista de espera.',
        '',
        'Em breve você recebe a resposta por e-mail ou WhatsApp. O teste com as 25 pessoas começa até 30 de outubro de 2026.',
        '',
        'Lembrete: o teste é feito somente com casos fictícios, sem pacientes reais, e não pede cartão nem pagamento.',
        '',
        'Equipe Nuvita Psi',
      ].join('\n'),
    });
  }

  private async enviar(conteudo: { destino: string; responderPara?: string; assunto: string; mensagem: string }): Promise<void> {
    try {
      await this.email.send({ canal: CanalNotificacao.EMAIL, conteudo });
      this.logger.log(`E-mail da inscrição de teste aceito pelo provedor: ${conteudo.assunto}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail da inscrição de teste: ${(error as Error).message}`);
    }
  }
}
