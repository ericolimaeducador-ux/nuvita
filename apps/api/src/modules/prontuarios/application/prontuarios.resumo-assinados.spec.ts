import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuariosService } from './prontuarios.service';

// O laudo afirma a terceiros "desde X, N sessões": só prontuário ASSINADO conta (mesma decisão do BUG-025).
const ctx = {
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub: 'psi-1', email: 'p@x.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
};
const assinado = { medicoId: 'psi-1', dataAssinatura: new Date('2026-10-26T12:00:00Z'), hash: 'h', crp: 'CRP 06/1' };
const sessao = (id: string, data: string, over: Record<string, unknown> = {}) => ({
  id, pacienteId: 'pac-1', medicoId: 'psi-1', tipo: TipoAtendimento.PSICOTERAPIA, agendamentoId: `ag-${id}`,
  dataAtendimento: new Date(data), assinado, ...over,
});

function criar(sessoes: unknown[]) {
  return new ProntuariosService(
    { listByPaciente: jest.fn().mockResolvedValue(sessoes) } as never, { autocomplete: jest.fn() } as never,
    { create: jest.fn().mockResolvedValue(undefined) } as never, { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as never,
    {} as never, { findById: jest.fn() } as never,
  );
}

describe('ProntuariosService.resumoAcompanhamento — só prontuário assinado', () => {
  it('rascunho não conta: nem no total nem no "desde"', async () => {
    const service = criar([
      sessao('a', '2026-09-10T12:00:00Z'),
      sessao('b', '2026-10-01T12:00:00Z'),
      sessao('rascunho', '2026-01-01T12:00:00Z', { assinado: undefined }),
    ]);
    await expect(service.resumoAcompanhamento('pac-1', undefined, ctx)).resolves.toEqual({
      desde: new Date('2026-09-10T12:00:00Z'), totalSessoes: 2,
    });
  });

  it('só rascunhos: desde=null e total 0', async () => {
    const service = criar([sessao('r1', '2026-09-10T12:00:00Z', { assinado: undefined })]);
    await expect(service.resumoAcompanhamento('pac-1', undefined, ctx)).resolves.toEqual({ desde: null, totalSessoes: 0 });
  });
});
