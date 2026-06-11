import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

@Injectable()
export class EmailSender implements NotificacaoSender {
  constructor(private readonly configService: ConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.EMAIL;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const provider = this.configService.get<string>('EMAIL_PROVIDER') ?? 'resend';
    if (provider === 'sendgrid') {
      await this.sendSendGrid(input);
      return;
    }

    await this.sendResend(input);
  }

  private async sendResend(input: SendNotificacaoInput): Promise<void> {
    await this.post('https://api.resend.com/emails', {
      Authorization: `Bearer ${this.configService.getOrThrow<string>('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    }, {
      from: this.configService.getOrThrow<string>('EMAIL_FROM'),
      to: input.conteudo.destino,
      subject: input.conteudo.assunto ?? 'Notificacao',
      text: input.conteudo.mensagem,
    });
  }

  private async sendSendGrid(input: SendNotificacaoInput): Promise<void> {
    await this.post('https://api.sendgrid.com/v3/mail/send', {
      Authorization: `Bearer ${this.configService.getOrThrow<string>('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    }, {
      personalizations: [{ to: [{ email: input.conteudo.destino }] }],
      from: { email: this.configService.getOrThrow<string>('EMAIL_FROM') },
      subject: input.conteudo.assunto ?? 'Notificacao',
      content: [{ type: 'text/plain', value: input.conteudo.mensagem }],
    });
  }

  private async post(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Email provider failed with HTTP ${response.status}: ${await response.text()}`);
    }
  }
}
