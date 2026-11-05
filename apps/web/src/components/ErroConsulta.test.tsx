import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { ErroConsulta } from './ErroConsulta';

function erroHttp(status: number, mensagemInterna = 'erro interno') {
  return new AxiosError(mensagemInterna, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

describe('ErroConsulta', () => {
  it('é um alerta acessível', () => {
    render(<ErroConsulta erro={erroHttp(500)} refetch={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('erro-consulta')).toBeInTheDocument();
  });

  it('403: mensagem de perfil sem acesso e SEM botão de tentar de novo', () => {
    render(<ErroConsulta erro={erroHttp(403)} refetch={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Seu perfil não tem acesso a esta informação');
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('5xx: COM botão que chama refetch', async () => {
    const refetch = vi.fn();
    render(<ErroConsulta erro={erroHttp(503)} refetch={refetch} />);
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('rede: COM botão que chama refetch', async () => {
    const refetch = vi.fn();
    render(<ErroConsulta erro={new AxiosError('Network Error', 'ERR_NETWORK')} refetch={refetch} />);
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sem refetch não mostra botão (não há o que chamar)', () => {
    render(<ErroConsulta erro={erroHttp(500)} />);
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it('mostra o nome do recurso na falha', () => {
    render(<ErroConsulta erro={erroHttp(500)} refetch={vi.fn()} recurso="os atendimentos" />);
    expect(screen.getByRole('alert')).toHaveTextContent('os atendimentos');
  });

  it('não exibe stack nem mensagem interna do erro', () => {
    const e = erroHttp(500, 'NullPointerException at servico.ts:12');
    e.stack = 'Error: at servico.ts:12\n    at handler (/app/dist/main.js:99)';
    const { container } = render(<ErroConsulta erro={e} refetch={vi.fn()} />);
    expect(container.textContent).not.toMatch(/NullPointer|servico\.ts|main\.js|at handler/);
  });
});
