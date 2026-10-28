import { UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { DocumentosEmitidosService } from './documentos-emitidos.service';

// Atestado afirma o atendimento: início <= agora. Declaração afirma o intervalo inteiro: fim <= agora.
const emMin = (m: number) => new Date(Date.now() + m * 60_000);
const ctx = (papel: Papel, sub: string) => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', nome: 'Dra. Ana', jti: 'j', typ: 'access' as const },
});
const dto = { pacienteId: 'pac-1', agendamentoId: 'ag-1' };

function criar(inicio: Date, fim: Date) {
  const documentos = { create: jest.fn(async (i: Record<string, unknown>) => ({ id: 'doc-1', ...i })) };
  const ag = { id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1', status: StatusAgendamento.CONCLUIDO, dataHoraInicio: inicio, dataHoraFim: fim };
  const service = new DocumentosEmitidosService(
    documentos as never, { create: jest.fn().mockResolvedValue(undefined) } as never,
    { obterParaEmissao: jest.fn().mockResolvedValue(ag) } as never,
    { resumoPorIds: jest.fn().mockResolvedValue(new Map([['pac-1', { nome: 'Paciente Fictício' }]])) } as never,
    { contextoDeEmissao: jest.fn().mockResolvedValue({ nome: 'Clínica', fusoHorario: 'America/Sao_Paulo' }), assertDocumentoInformado: jest.fn().mockResolvedValue(undefined) } as never,
    { findById: jest.fn().mockResolvedValue({ id: 'psi-1', crp: '06/12345' }) } as never,
  );
  return { service, documentos };
}

describe('Atestado — atendimento no futuro', () => {
  it('início no futuro: 422 e nada é emitido', async () => {
    const { service, documentos } = criar(emMin(5), emMin(55));
    await expect(service.emitirAtestado(dto, ctx(Papel.PSICOLOGO, 'psi-1'))).rejects.toThrow(new UnprocessableEntityException('O atendimento ainda não começou.'));
    expect(documentos.create).not.toHaveBeenCalled();
  });
  it('já começou (ainda não terminou): emite', async () => {
    const { service } = criar(emMin(-5), emMin(45));
    await expect(service.emitirAtestado(dto, ctx(Papel.PSICOLOGO, 'psi-1'))).resolves.toBeDefined();
  });
});

describe('Declaração — só depois do fim', () => {
  it('início no futuro: a regra da declaração é o FIM, então 422 "ainda não terminou"', async () => {
    const { service, documentos } = criar(emMin(5), emMin(55));
    await expect(service.emitirDeclaracao(dto, ctx(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(new UnprocessableEntityException('O atendimento ainda não terminou.'));
    expect(documentos.create).not.toHaveBeenCalled();
  });
  it('começou mas não terminou: 422 "ainda não terminou"', async () => {
    const { service, documentos } = criar(emMin(-5), emMin(45));
    await expect(service.emitirDeclaracao(dto, ctx(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(new UnprocessableEntityException('O atendimento ainda não terminou.'));
    expect(documentos.create).not.toHaveBeenCalled();
  });
  it('já terminou: emite', async () => {
    const { service } = criar(emMin(-60), emMin(-10));
    await expect(service.emitirDeclaracao(dto, ctx(Papel.SECRETARIA, 'sec-1'))).resolves.toBeDefined();
  });
});
