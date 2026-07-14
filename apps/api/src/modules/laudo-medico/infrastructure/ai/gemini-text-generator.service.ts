import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfigService } from '../../../../common/security/config.service';
import { AiTextGenerator } from '../../application/ports/ai-text-generator';

const MODEL = 'gemini-flash-latest';

@Injectable()
export class GeminiTextGeneratorService implements AiTextGenerator {
  private readonly client: GoogleGenerativeAI | null;

  constructor(configService: AppConfigService) {
    const apiKey = configService.getConfig().geminiApiKey;
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async gerarJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new ServiceUnavailableException('Pré-preenchimento por IA não está configurado (GEMINI_API_KEY ausente).');
    }

    const model = this.client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: schema as any,
      },
    });

    const result = await model.generateContent(prompt);
    const texto = result.response.text();
    try {
      return JSON.parse(texto) as T;
    } catch {
      throw new ServiceUnavailableException('A IA retornou uma resposta em formato inesperado.');
    }
  }
}
