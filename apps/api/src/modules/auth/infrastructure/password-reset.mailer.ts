import { Injectable } from '@nestjs/common';
import { PasswordResetMailer } from '../application/password-reset.service';
import { CanalNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { EmailSender } from '../../notificacoes/infrastructure/senders/email.sender';

@Injectable()
export class PasswordResetEmailMailer implements PasswordResetMailer {
  constructor(private readonly email: EmailSender) {}

  async enviarLinkRedefinicao(input: { email: string; nome: string; link: string; validadeMinutos: number }): Promise<void> {
    await this.email.send({
      canal: CanalNotificacao.EMAIL,
      conteudo: {
        destino: input.email,
        assunto: 'Redefinição de senha - Nuvita Psi',
        mensagem: [
          `Olá, ${input.nome.split(' ')[0]}!`,
          '',
          'Recebemos um pedido para redefinir a senha da sua conta no Nuvita Psi.',
          `Use o link abaixo (vale por ${input.validadeMinutos} minutos e só pode ser usado uma vez):`,
          '',
          input.link,
          '',
          'Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.',
          'Redefinir a senha não altera o seu código 2FA. Se perdeu o acesso ao código, escreva para contato@nuvita.app.br.',
          '',
          'Equipe Nuvita Psi',
        ].join('\n'),
      },
    });
  }
}
