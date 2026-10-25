import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../../common/security/config.service';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Cliente fino da Messages API da Anthropic — mesmo padrão de fetch direto
 * (sem SDK) já usado pelos outros provedores externos do projeto (ver
 * EmailSender em notificacoes/infrastructure/senders/email.sender.ts).
 */
@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);

  constructor(private readonly configService: AppConfigService) {}

  async gerarTexto(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
    const config = this.configService.getConfig();
    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      // Erro de configuração, não falha do servidor: 503.
      throw new ServiceUnavailableException(
        'Assistente de IA não configurado (ANTHROPIC_API_KEY ausente). Peça ao administrador para configurar.',
      );
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Anthropic API respondeu HTTP ${response.status}: ${body}`);
      throw new InternalServerErrorException('Falha ao gerar sugestão com IA. Tente novamente em instantes.');
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const texto = data.content?.find((b) => b.type === 'text')?.text;
    if (!texto) {
      throw new InternalServerErrorException('A IA não retornou nenhum conteúdo.');
    }

    return texto.trim();
  }
}
