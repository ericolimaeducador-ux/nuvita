import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../common/security/config.service';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

@Injectable()
export class SmsSender implements NotificacaoSender {
  constructor(private readonly configService: AppConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.SMS;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const accountSid = this.requireConfig(this.configService.getConfig().twilioAccountSid, 'TWILIO_ACCOUNT_SID');
    const authToken = this.requireConfig(this.configService.getConfig().twilioAuthToken, 'TWILIO_AUTH_TOKEN');
    const from = this.requireConfig(this.configService.getConfig().twilioFrom, 'TWILIO_FROM');
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      From: from,
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

  private requireConfig(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Missing SMS provider configuration: ${name}`);
    }

    return value;
  }
}
