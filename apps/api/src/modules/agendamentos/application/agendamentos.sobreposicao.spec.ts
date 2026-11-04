import { BadRequestException, ConflictException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../domain/agendamento.entity';
import { AgendamentosService } from './agendamentos.service';

// BUG-028: o mesmo profissional não pode ter dois atendimentos ativos sobrepostos.
const at = (hhmm: string) => `2026-11-03T${hhmm}:00.000Z`;
const ctx = (papel: Papel, sub = 'psi-A') => ({
  ip: '1.1.1.1', userAgent: 'jest',
  user: { sub, email: 'a@x.test', papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});
const dto = (inicio: string, fim: string, over: Record<string, unknown> = {}) => ({
  clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-A', modalidade: 'psicologia', tipo: 'sessao_psicoterapia',
  dataHoraInicio: at(inicio), dataHoraFim: at(fim), ...over,
});

type Existente = { id: string; medicoId: string; status: StatusAgendamento; ini: string; fim: string };

// Repositório em memória que aplica a MESMA condição que o Mongo deve aplicar.
function criar(existentes: Existente[]) {
  const ativos = [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO, StatusAgendamento.CONCLUIDO];
  const agendamentos = {
    create: jest.fn().mockImplementation(async (i) => ({ id: 'novo', ...i })),
    update: jest.fn().mockImplementation(async (_c, id, d) => ({ id, ...d })),
    findById: jest.fn().mockImplementation(async (_c: string, id: string) => {
      const e = existentes.find((x) => x.id === id);
      return e && { id: e.id, clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: e.medicoId, status: e.status, dataHoraInicio: new Date(at(e.ini)), dataHoraFim: new Date(at(e.fim)) };
    }),
    findAtivoSobreposto: jest.fn().mockImplementation(async (_c: string, medicoId: string, inicio: Date, fim: Date, excluirId?: string) => {
      const e = existentes.find((x) => x.medicoId === medicoId && x.id !== excluirId && ativos.includes(x.status)
        && new Date(at(x.ini)) < fim && inicio < new Date(at(x.fim)));
      return e ? { id: e.id } : null;
    }),
  };
  const service = new AgendamentosService(
    agendamentos as never, { create: jest.fn().mockResolvedValue(undefined) } as never,
    { resumoPorIds: jest.fn().mockResolvedValue(new Map([['pac-1', { nome: 'P' }]])) } as never,
    { create: jest.fn().mockResolvedValue(undefined) } as never, { findById: jest.fn().mockResolvedValue({ id: 'psi-A', clinicaId: 'cli-1' }) } as never,
  );
  return { service, agendamentos };
}
const base: Existente = { id: 'ag-1', medicoId: 'psi-A', status: StatusAgendamento.AGENDADO, ini: '14:00', fim: '14:50' };

describe('AgendamentosService.create — sobreposição', () => {
  it.each([StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO, StatusAgendamento.CONCLUIDO])('sobrepõe %s: 409 e nada é criado', async (status) => {
    const { service, agendamentos } = criar([{ ...base, status }]);
    await expect(service.create(dto('14:30', '15:20') as never, ctx(Papel.PSICOLOGO))).rejects.toThrow(new ConflictException('Você já tem atendimento neste horário'));
    expect(agendamentos.create).not.toHaveBeenCalled();
  });
  it('mesmo horário exato (14:00–14:50): 409', async () => {
    const { service } = criar([base]);
    await expect(service.create(dto('14:00', '14:50') as never, ctx(Papel.PSICOLOGO))).rejects.toThrow(ConflictException);
  });
  it('um intervalo contido no outro: 409', async () => {
    const { service } = criar([base]);
    await expect(service.create(dto('14:10', '14:20') as never, ctx(Papel.PSICOLOGO))).rejects.toThrow(ConflictException);
  });
  it('encostando (fim 14:50, início 14:50): aceito; e antes (13:10–14:00): aceito', async () => {
    const { service } = criar([base]);
    await expect(service.create(dto('14:50', '15:40') as never, ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
    await expect(service.create(dto('13:10', '14:00') as never, ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
  });
  it.each([StatusAgendamento.CANCELADO, StatusAgendamento.FALTA])('contra %s: o horário está livre', async (status) => {
    const { service } = criar([{ ...base, status }]);
    await expect(service.create(dto('14:00', '14:50') as never, ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
  });
  it('outro profissional no mesmo horário: aceito', async () => {
    const { service } = criar([{ ...base, medicoId: 'psi-B' }]);
    await expect(service.create(dto('14:00', '14:50') as never, ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
  });
  it('a secretária está sujeita à mesma regra', async () => {
    const { service } = criar([base]);
    await expect(service.create(dto('14:30', '15:20') as never, ctx(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(ConflictException);
  });
  it('fim <= início: 400 (igual e invertido)', async () => {
    const { service, agendamentos } = criar([]);
    await expect(service.create(dto('14:00', '14:00') as never, ctx(Papel.PSICOLOGO))).rejects.toThrow(BadRequestException);
    await expect(service.create(dto('14:50', '14:00') as never, ctx(Papel.PSICOLOGO))).rejects.toThrow(BadRequestException);
    expect(agendamentos.create).not.toHaveBeenCalled();
  });
});

describe('AgendamentosService.update — sobreposição', () => {
  const outro: Existente = { id: 'ag-2', medicoId: 'psi-A', status: StatusAgendamento.AGENDADO, ini: '16:00', fim: '16:50' };
  it('mover para dentro de outro atendimento: 409', async () => {
    const { service, agendamentos } = criar([base, outro]);
    await expect(service.update('ag-2', { dataHoraInicio: at('14:30'), dataHoraFim: at('15:20') } as never, 'cli-1', ctx(Papel.PSICOLOGO))).rejects.toThrow(ConflictException);
    expect(agendamentos.update).not.toHaveBeenCalled();
  });
  it('não colide consigo mesmo (mexer só no fim do próprio horário)', async () => {
    const { service } = criar([base]);
    await expect(service.update('ag-1', { dataHoraFim: at('15:00') } as never, 'cli-1', ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
  });
  it('editar só observações não consulta sobreposição', async () => {
    const { service, agendamentos } = criar([base, { ...outro, ini: '14:00', fim: '14:50' }]);
    await service.update('ag-2', { observacoes: 'x' } as never, 'cli-1', ctx(Papel.PSICOLOGO));
    expect(agendamentos.findAtivoSobreposto).not.toHaveBeenCalled();
  });
  it('fim <= início na edição (usando o início já salvo): 400', async () => {
    const { service } = criar([base]);
    await expect(service.update('ag-1', { dataHoraFim: at('14:00') } as never, 'cli-1', ctx(Papel.PSICOLOGO))).rejects.toThrow(BadRequestException);
  });
  it('agendamento cancelado pode ser editado sem checar sobreposição', async () => {
    const { service } = criar([base, { ...outro, status: StatusAgendamento.CANCELADO }]);
    await expect(service.update('ag-2', { dataHoraInicio: at('14:00'), dataHoraFim: at('14:50') } as never, 'cli-1', ctx(Papel.PSICOLOGO))).resolves.toBeDefined();
  });
});
