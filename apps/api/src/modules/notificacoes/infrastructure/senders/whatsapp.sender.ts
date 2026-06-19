import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../common/security/config.service';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

@Injectable()
export class WhatsAppSender implements NotificacaoSender {
  constructor(private readonly configService: AppConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.WHATSAPP;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const provider = this.configService.getConfig().whatsappProvider ?? 'evolution';
    if (provider === 'zapi') {
      await this.sendZApi(input);
      return;
    }

    await this.sendEvolution(input);
  }

  private async sendEvolution(input: SendNotificacaoInput): Promise<void> {
    const baseUrl = this.requireConfig(this.configService.getConfig().evolutionApiUrl, 'EVOLUTION_API_URL');
    const instance = this.requireConfig(this.configService.getConfig().evolutionInstance, 'EVOLUTION_INSTANCE');
    const apiKey = this.requireConfig(this.configService.getConfig().evolutionApiKey, 'EVOLUTION_API_KEY');
    await this.post(`${baseUrl}/message/sendText/${instance}`, {
      apikey: apiKey,
      'Content-Type': 'application/json',
    }, {
      number: input.conteudo.destino,
      text: input.conteudo.mensagem,
    });
  }

  private async sendZApi(input: SendNotificacaoInput): Promise<void> {
    const instanceId = this.requireConfig(this.configService.getConfig().zapiInstanceId, 'ZAPI_INSTANCE_ID');
    const token = this.requireConfig(this.configService.getConfig().zapiToken, 'ZAPI_TOKEN');
    const clientToken = this.requireConfig(this.configService.getConfig().zapiClientToken, 'ZAPI_CLIENT_TOKEN');
    await this.post(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      'Client-Token': clientToken,
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

  private requireConfig(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Missing WhatsApp provider configuration: ${name}`);
    }

    return value;
  }
}
