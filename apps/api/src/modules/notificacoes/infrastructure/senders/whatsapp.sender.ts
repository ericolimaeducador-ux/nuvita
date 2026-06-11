import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

@Injectable()
export class WhatsAppSender implements NotificacaoSender {
  constructor(private readonly configService: ConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.WHATSAPP;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const provider = this.configService.get<string>('WHATSAPP_PROVIDER') ?? 'evolution';
    if (provider === 'zapi') {
      await this.sendZApi(input);
      return;
    }

    await this.sendEvolution(input);
  }

  private async sendEvolution(input: SendNotificacaoInput): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('EVOLUTION_API_URL');
    const instance = this.configService.getOrThrow<string>('EVOLUTION_INSTANCE');
    await this.post(`${baseUrl}/message/sendText/${instance}`, {
      apikey: this.configService.getOrThrow<string>('EVOLUTION_API_KEY'),
      'Content-Type': 'application/json',
    }, {
      number: input.conteudo.destino,
      text: input.conteudo.mensagem,
    });
  }

  private async sendZApi(input: SendNotificacaoInput): Promise<void> {
    const instanceId = this.configService.getOrThrow<string>('ZAPI_INSTANCE_ID');
    const token = this.configService.getOrThrow<string>('ZAPI_TOKEN');
    await this.post(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      'Client-Token': this.configService.getOrThrow<string>('ZAPI_CLIENT_TOKEN'),
      'Content-Type': 'application/json',
    }, {
      phone: input.conteudo.destino,
      message: input.conteudo.mensagem,
    });
  }

  private async post(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp provider failed with HTTP ${response.status}: ${await response.text()}`);
    }
  }
}
