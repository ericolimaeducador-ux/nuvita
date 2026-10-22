import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AxiosError } from 'axios';
import { comoLista, RespostaInvalidaError, useMensagemErro } from './consulta';

function erroHttp(status: number, mensagemInterna = 'NullPointerException at servico.ts:12') {
  return new AxiosError(
    mensagemInterna,
    status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status, data: { message: mensagemInterna }, statusText: '', headers: {}, config: {} as never },
  );
}

describe('comoLista', () => {
  it('deixa passar array (mesma referência), inclusive vazio', () => {
    const lista = [{ id: 1 }];
    expect(comoLista(lista)).toBe(lista);
    const vazia: unknown[] = [];
    expect(comoLista(vazia)).toBe(vazia);
  });

  it('deixa passar página com items', () => {
    const pagina = { items: [{ id: 1 }], total: 1 };
    expect(comoLista(pagina)).toBe(pagina);
  });

  it('deixa passar página com data', () => {
    const pagina = { data: [{ id: 1 }], nextCursor: null };
    expect(comoLista(pagina)).toBe(pagina);
  });

  it('deixa passar página vazia legítima', () => {
    expect(() => comoLista({ items: [], total: 0 })).not.toThrow();
  });

  it.each([
    ['HTML de gateway', '<!doctype html><html><body>502 Bad Gateway</body></html>'],
    ['string comum', 'ok'],
    ['objeto vazio', {}],
    ['objeto sem lista', { total: 3, foo: [] }],
    ['items que não é lista', { items: 'x' }],
    ['data que é objeto', { data: {} }],
    ['null', null],
    ['undefined', undefined],
    ['número', 42],
  ])('lança RespostaInvalidaError para %s', (_nome, entrada) => {
    expect(() => comoLista(entrada)).toThrow(RespostaInvalidaError);
  });

  it('não vaza o corpo da resposta na mensagem do erro', () => {
    try {
      comoLista('<html>segredo-do-gateway</html>');
      throw new Error('deveria lançar');
    } catch (e) {
      expect((e as Error).message).not.toContain('segredo-do-gateway');
      expect((e as Error).message).not.toContain('<html');
    }
  });
});

describe('useMensagemErro', () => {
  const usar = (erro: unknown, recurso?: string) =>
    renderHook(() => useMensagemErro(erro, recurso)).result.current;

  it('403: sem acesso, mensagem fixa, sem nova tentativa', () => {
    const r = usar(erroHttp(403));
    expect(r.tipo).toBe('sem-acesso');
    expect(r.mensagem).toBe('Seu perfil não tem acesso a esta informação.');
    expect(r.podeTentarNovamente).toBe(false);
  });

  it('404: não encontrado, sem nova tentativa', () => {
    const r = usar(erroHttp(404));
    expect(r.tipo).toBe('nao-encontrado');
    expect(r.mensagem).toMatch(/não encontr/i);
    expect(r.podeTentarNovamente).toBe(false);
  });

  it.each([500, 502, 503])('%i: erro de servidor, com nova tentativa', (status) => {
    const r = usar(erroHttp(status));
    expect(r.tipo).toBe('servidor');
    expect(r.podeTentarNovamente).toBe(true);
    expect(r.mensagem).toMatch(/não foi possível carregar/i);
  });

  it('rede: sem resposta, com nova tentativa', () => {
    const r = usar(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(r.tipo).toBe('rede');
    expect(r.podeTentarNovamente).toBe(true);
    expect(r.mensagem).toMatch(/conex/i);
  });

  it('401: sessão expirada, sem nova tentativa', () => {
    const r = usar(erroHttp(401));
    expect(r.tipo).toBe('sessao');
    expect(r.podeTentarNovamente).toBe(false);
  });

  it('resposta que não é lista: tratada como falha com nova tentativa', () => {
    const r = usar(new RespostaInvalidaError('x'));
    expect(r.tipo).toBe('resposta-invalida');
    expect(r.podeTentarNovamente).toBe(true);
  });

  it('erro desconhecido: mensagem genérica com nova tentativa', () => {
    const r = usar(new Error('boom'));
    expect(r.tipo).toBe('desconhecido');
    expect(r.podeTentarNovamente).toBe(true);
    expect(r.mensagem.length).toBeGreaterThan(0);
  });

  it('usa o nome do recurso na mensagem de falha', () => {
    expect(usar(erroHttp(500), 'os prontuários').mensagem).toContain('os prontuários');
  });

  it('nunca expõe mensagem interna nem stack do erro', () => {
    const e = erroHttp(500, 'NullPointerException at servico.ts:12');
    e.stack = 'Error: at servico.ts:12\n    at handler (/app/dist/main.js:99)';
    for (const erro of [e, erroHttp(403, 'detalhe interno 403'), new Error('stack-vazado')]) {
      const { mensagem } = usar(erro);
      expect(mensagem).not.toMatch(/NullPointer|servico\.ts|main\.js|detalhe interno|stack-vazado|at handler/);
    }
  });
});
