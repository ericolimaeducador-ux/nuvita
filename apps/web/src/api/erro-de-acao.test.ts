import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

// Uma ação que falha com 403 já ganha o toast "Acesso negado" (com a mensagem do servidor) do interceptor do axios.
// O onError da tela não pode somar um segundo toast "Erro" para o mesmo erro; os demais erros seguem com o toast "Erro".
const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@/components/ui/use-toast', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: mocks.error } }));

import { avisarErroDeAcao } from './client';

const erroHttp = (status: number, message: string) =>
  new AxiosError('falhou', 'ERR_BAD_REQUEST', undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { message },
  });

describe('avisarErroDeAcao', () => {
  beforeEach(() => mocks.error.mockClear());

  it('403: não toca no toast (o interceptor já avisou "Acesso negado" com a mensagem do servidor)', () => {
    avisarErroDeAcao(erroHttp(403, 'Este agendamento pertence a outro profissional.'));
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('409 (e qualquer outro erro): um toast "Erro" com a mensagem do servidor', () => {
    avisarErroDeAcao(erroHttp(409, 'Você já tem atendimento neste horário'));
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.error).toHaveBeenCalledWith('Erro', 'Você já tem atendimento neste horário');
  });

  it('erro sem resposta (rede): toast "Erro" com a mensagem do cliente', () => {
    avisarErroDeAcao(new Error('Network Error'));
    expect(mocks.error).toHaveBeenCalledWith('Erro', 'Network Error');
  });
});
