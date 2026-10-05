import { useMemo } from 'react';
import { isAxiosError } from 'axios';
import type { PageResult } from '@/types';

/**
 * Resposta de endpoint de lista que não tem o formato de lista (ex.: HTML de gateway/proxy,
 * string, objeto sem `items`/`data`). Mensagem fixa: nunca carrega o corpo recebido.
 */
export class RespostaInvalidaError extends Error {
  // `_detalhe` é aceito só por conveniência de quem lança; nunca entra na mensagem.
  constructor(_detalhe?: string) {
    super('Resposta do servidor em formato inesperado.');
    this.name = 'RespostaInvalidaError';
  }
}

/**
 * Valida que a resposta de um endpoint de lista é array, `{ items: [] }` ou `{ data: [] }` e a
 * devolve como veio. Qualquer outra coisa lança — a query cai em `isError` em vez de virar
 * "lista vazia" silenciosa.
 */
export function comoLista<T>(dados: unknown): T[] | PageResult<T> {
  if (Array.isArray(dados)) return dados as T[];
  if (dados !== null && typeof dados === 'object') {
    const o = dados as Record<string, unknown>;
    if (Array.isArray(o.items) || Array.isArray(o.data)) return dados as PageResult<T>;
  }
  throw new RespostaInvalidaError();
}

/**
 * Objeto que carrega uma lista em um campo (ex.: painel.pacientes). Devolve o objeto como veio;
 * qualquer outra coisa lança — a ausência do campo não pode virar "sem itens".
 */
export function comoObjetoComLista<T extends object>(dados: unknown, campo: string): T {
  if (dados !== null && typeof dados === 'object' && Array.isArray((dados as Record<string, unknown>)[campo])) {
    return dados as T;
  }
  throw new RespostaInvalidaError();
}

/** Primeira consulta (na ordem dada) em erro, ou null. Para páginas que dependem de várias consultas. */
export interface ConsultaComFalha {
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

export function primeiraFalha(...consultas: ConsultaComFalha[]): ConsultaComFalha | null {
  return consultas.find((q) => q.isError) ?? null;
}

export type TipoErroConsulta =
  | 'sem-acesso'
  | 'nao-encontrado'
  | 'servidor'
  | 'rede'
  | 'sessao'
  | 'resposta-invalida'
  | 'desconhecido';

export interface ErroConsultaInfo {
  tipo: TipoErroConsulta;
  mensagem: string;
  podeTentarNovamente: boolean;
}

/** Mensagens fixas: nunca usam `error.message` nem stack (podem trazer detalhe interno). */
export function classificarErro(erro: unknown, recurso = 'esta informação'): ErroConsultaInfo {
  const falha = `Não foi possível carregar ${recurso}. Tente novamente; se persistir, contate o suporte.`;

  if (erro instanceof RespostaInvalidaError) {
    return { tipo: 'resposta-invalida', mensagem: falha, podeTentarNovamente: true };
  }

  if (isAxiosError(erro)) {
    const status = erro.response?.status;
    if (status === undefined) {
      return {
        tipo: 'rede',
        mensagem: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
        podeTentarNovamente: true,
      };
    }
    if (status === 401) {
      return { tipo: 'sessao', mensagem: 'Sua sessão expirou. Entre novamente.', podeTentarNovamente: false };
    }
    if (status === 403) {
      return {
        tipo: 'sem-acesso',
        mensagem: 'Seu perfil não tem acesso a esta informação.',
        podeTentarNovamente: false,
      };
    }
    if (status === 404) {
      return { tipo: 'nao-encontrado', mensagem: 'Não encontramos esta informação.', podeTentarNovamente: false };
    }
    if (status >= 500) {
      return { tipo: 'servidor', mensagem: falha, podeTentarNovamente: true };
    }
  }

  return { tipo: 'desconhecido', mensagem: falha, podeTentarNovamente: true };
}

export function useMensagemErro(erro: unknown, recurso?: string): ErroConsultaInfo {
  return useMemo(() => classificarErro(erro, recurso), [erro, recurso]);
}
