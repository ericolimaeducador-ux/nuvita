import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

@Injectable()
export class SmsSender implements NotificacaoSender {
  constructor(private readonly configService: ConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.SMS;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const accountSid = this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      From: this.configService.getOrThrow<string>('TWILIO_FROM'),
      To: input.conteudo.destino,
      Body: input.conteudo.mensagem,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Twilio failed with HTTP ${response.status}: ${await response.text()}`);
    }
  }
}
