import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AreaModuloAvaliacao, ModuloAvaliacao } from './consulta-enfermagem.entity';

/**
 * Definição de um módulo da Avaliação (por área). Cada etapa 5b–5d registra a sua com a classe de validação dos `dados`
 * (class-validator). Nesta etapa NENHUM módulo é registrado: o slot existe, mas qualquer módulo enviado é recusado.
 */
export interface DefinicaoModuloAvaliacao {
  area: AreaModuloAvaliacao;
  /** Classe class-validator dos `dados`... */
  dto?: new () => object;
  /** ...ou o validador do pacote compartilhado (lista de erros com NOMES de campo; vazia = válido). */
  validar?: (dados: unknown) => string[];
}

// Provido por fábrica no módulo (lista de definições vazia nesta etapa).
export class ModulosAvaliacaoRegistry {
  private readonly definicoes = new Map<AreaModuloAvaliacao, DefinicaoModuloAvaliacao>();

  constructor(definicoes: DefinicaoModuloAvaliacao[] = []) {
    for (const d of definicoes) this.registrar(d);
  }

  registrar(definicao: DefinicaoModuloAvaliacao): void {
    this.definicoes.set(definicao.area, definicao);
  }

  /** Valida cada módulo pela definição da sua área. Área sem definição ou dados inválidos -> 400 (só nomes de campo). */
  async validar(modulos: ModuloAvaliacao[]): Promise<ModuloAvaliacao[]> {
    const vistos = new Set<AreaModuloAvaliacao>();
    const validados: ModuloAvaliacao[] = [];
    for (const m of modulos) {
      const def = this.definicoes.get(m.area);
      if (!def) throw new BadRequestException(`Modulo de avaliacao ${m.area} ainda nao disponivel.`);
      if (vistos.has(m.area)) throw new BadRequestException(`Modulo de avaliacao ${m.area} repetido.`);
      vistos.add(m.area);
      if (def.validar) {
        const errosCompartilhados = def.validar(m.dados ?? {});
        if (errosCompartilhados.length > 0) {
          throw new BadRequestException(`Dados invalidos no modulo ${m.area} (${errosCompartilhados.join('; ')}).`);
        }
        validados.push({ area: m.area, dados: JSON.parse(JSON.stringify(m.dados ?? {})) as Record<string, unknown> });
        continue;
      }
      const instancia = plainToInstance(def.dto!, m.dados ?? {});
      const erros = await validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
      if (erros.length > 0) {
        throw new BadRequestException(
          `Dados invalidos no modulo ${m.area} (campos: ${erros.map((e) => e.property).join(', ')}).`,
        );
      }
      validados.push({ area: m.area, dados: { ...(instancia as Record<string, unknown>) } });
    }
    return validados;
  }
}
