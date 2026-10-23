import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuariosService } from './prontuarios.service';

// BUG-020: o prontuário é ancorado na agenda. A data NUNCA vem do cliente: é o horário AGENDADO do atendimento.
const INICIO = new Date('2026-10-20T17:00:00.000Z');
const agendamento = (over: Record<string, unknown> = {}) => ({
  id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1', status: StatusAgendamento.AGENDADO,
  dataHoraInicio: INICIO, dataHoraFim: new Date('2026-10-20T18:00:00.000Z'), ...over,
});
const ctxDe = (sub = 'psi-1') => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: 'p@x.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});

function criar(over: { ag?: unknown | null; existente?: unknown; sessoes?: unknown[] } = {}) {
  const prontuarios = {
    create: jest.fn(async (input: Record<string, unknown>) => ({ id: 'pr-1', ...input })),
    findByAgendamento: jest.fn().mockResolvedValue(over.existente ?? null),
    listByPaciente: jest.fn().mockResolvedValue(over.sessoes ?? []),
  };
  const agendamentos = {
    obterParaEmissao: jest.fn(async () => {
      if (over.ag === null) throw new NotFoundException('Agendamento nao encontrado.');
      return over.ag ?? agendamento();
    }),
    conclude: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ProntuariosService(
    prontuarios as never, { autocomplete: jest.fn() } as never, { create: jest.fn() } as never,
    { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as never, agendamentos as never,
  );
  return { service, prontuarios, agendamentos };
}

const dto = (over: Record<string, unknown> = {}) =>
  ({ clinicaId: 'cli-1', pacienteId: 'pac-1', agendamentoId: 'ag-1', tipo: TipoAtendimento.PSICOTERAPIA, ...over }) as never;

describe('ProntuariosService.create – ancorado na agenda', () => {
  it('a data do prontuário é o horário AGENDADO; a data enviada pelo cliente é ignorada', async () => {
    const { service, prontuarios } = criar();
    await service.create(dto({ dataAtendimento: '2020-01-01T00:00:00.000Z' }), ctxDe());
    const gravado = prontuarios.create.mock.calls[0][0] as { dataAtendimento: Date; agendamentoId: string };
    expect(gravado.dataAtendimento).toEqual(INICIO);
    expect(gravado.agendamentoId).toBe('ag-1');
  });

  it('agendamento obrigatório: sem agendamentoId não cria', async () => {
    const { service, prontuarios } = criar();
    await expect(service.create(dto({ agendamentoId: undefined }), ctxDe())).rejects.toThrow(NotFoundException);
    expect(prontuarios.create).not.toHaveBeenCalled();
  });

  it('agendamento de outra clínica/inexistente → 404; de outro paciente → 404; de colega → 403', async () => {
    await expect(criar({ ag: null }).service.create(dto(), ctxDe())).rejects.toThrow(NotFoundException);
    await expect(criar({ ag: agendamento({ pacienteId: 'pac-2' }) }).service.create(dto(), ctxDe())).rejects.toThrow(NotFoundException);
    const colega = criar();
    colega.agendamentos.obterParaEmissao.mockRejectedValue(new ForbiddenException('outro profissional'));
    await expect(colega.service.create(dto(), ctxDe('psi-B'))).rejects.toThrow(ForbiddenException);
  });

  it.each([StatusAgendamento.CANCELADO, StatusAgendamento.FALTA])('atendimento %s não vira prontuário (422)', async (status) => {
    const { service, prontuarios } = criar({ ag: agendamento({ status }) });
    await expect(service.create(dto(), ctxDe())).rejects.toThrow(UnprocessableEntityException);
    expect(prontuarios.create).not.toHaveBeenCalled();
  });

  it('DUPLICIDADE: a mesma sessão não pode ser registrada duas vezes (409)', async () => {
    const { service, prontuarios } = criar({ existente: { id: 'pr-0', agendamentoId: 'ag-1' } });
    await expect(service.create(dto(), ctxDe())).rejects.toThrow(ConflictException);
    expect(prontuarios.create).not.toHaveBeenCalled();
  });

  it('segue concluindo o agendamento depois de registrar', async () => {
    const { service, agendamentos } = criar();
    await service.create(dto(), ctxDe());
    expect(agendamentos.conclude).toHaveBeenCalledWith('ag-1', 'cli-1', expect.anything());
  });
});

describe('ProntuariosService.updateDraft – âncora imutável', () => {
  it('a edição do rascunho não altera data nem agendamento', async () => {
    const atual = {
      id: 'pr-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1', agendamentoId: 'ag-1',
      dataAtendimento: INICIO, tipo: TipoAtendimento.PSICOTERAPIA,
    };
    const { service, prontuarios } = criar();
    (prontuarios as Record<string, jest.Mock>)['findById'] = jest.fn().mockResolvedValue(atual);
    (prontuarios as Record<string, jest.Mock>)['updateDraft'] = jest.fn().mockResolvedValue(atual);
    await service.updateDraft('pr-1', { dataAtendimento: '2020-01-01T00:00:00.000Z', agendamentoId: 'outro' } as never, undefined, ctxDe());
    const patch = (prontuarios as Record<string, jest.Mock>)['updateDraft'].mock.calls[0][2] as Record<string, unknown>;
    expect(patch['dataAtendimento']).toBeUndefined();
    expect(patch['agendamentoId']).toBeUndefined();
  });
});

describe('ProntuariosService.resumoAcompanhamento – fatos do laudo calculados no servidor', () => {
  const sessao = (id: string, data: string, over: Record<string, unknown> = {}) => ({
    id, pacienteId: 'pac-1', medicoId: 'psi-1', tipo: TipoAtendimento.PSICOTERAPIA, agendamentoId: `ag-${id}`,
    dataAtendimento: new Date(data), ...over,
  });

  it('"desde" e total contam só sessões ANCORADAS de psicoterapia do próprio psicólogo', async () => {
    const { service } = criar({
      sessoes: [
        sessao('a', '2026-09-10T12:00:00Z'),
        sessao('b', '2026-10-01T12:00:00Z'),
        sessao('c', '2026-01-01T12:00:00Z', { agendamentoId: undefined }), // legado sem âncora: não conta
        sessao('d', '2026-02-01T12:00:00Z', { medicoId: 'psi-B' }), // de colega: não conta
      ],
    });
    await expect(service.resumoAcompanhamento('pac-1', undefined, ctxDe())).resolves.toEqual({
      desde: new Date('2026-09-10T12:00:00Z'), totalSessoes: 2,
    });
  });

  it('sem sessões ancoradas: desde=null e total 0', async () => {
    const { service } = criar({ sessoes: [] });
    await expect(service.resumoAcompanhamento('pac-1', undefined, ctxDe())).resolves.toEqual({ desde: null, totalSessoes: 0 });
  });
});
