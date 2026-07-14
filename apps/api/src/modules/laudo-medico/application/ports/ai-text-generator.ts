/** Porta genérica para geração de texto/JSON estruturado via LLM — implementação concreta troca o provedor (hoje Gemini). */
export interface AiTextGenerator {
  /** Gera um objeto JSON a partir de um prompt, validado contra o schema informado (formato JSON Schema simplificado). */
  gerarJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T>;
}
