import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AnthropicClient } from './anthropic.client';

const comConfig = (anthropicApiKey?: string) =>
  new AnthropicClient({ getConfig: () => ({ anthropicApiKey, anthropicModel: 'm' }) } as never);

describe('AnthropicClient — chave ausente', () => {
  it('sem ANTHROPIC_API_KEY: 503 (erro de configuração), nunca 500 (falha do servidor)', async () => {
    const erro = await comConfig(undefined).gerarTexto('s', 'u').catch((e) => e);
    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    expect(erro).not.toBeInstanceOf(InternalServerErrorException);
    expect((erro as Error).message).toContain('ANTHROPIC_API_KEY');
  });

  it('chave vazia conta como ausente', async () => {
    const erro = await comConfig('').gerarTexto('s', 'u').catch((e) => e);
    expect(erro).toBeInstanceOf(ServiceUnavailableException);
  });
});
