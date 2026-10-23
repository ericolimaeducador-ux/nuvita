import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { DocumentosEmitidosService } from './documentos-emitidos.service';

// O servidor é a fonte do conteúdo: data/hora vêm SÓ do agendamento concluído; nada digitável.
const agendamento = (over: Record<string, unknown> = {}) => ({
  id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1',
  status: StatusAgendamento.CONCLUIDO,
  // 20/10/2026 17:00–18:00 UTC = 14:00–15:00 em America/Sao_Paulo
  dataHoraInicio: new Date('2026-10-20T17:00:00.000Z'), dataHoraFim: new Date('2026-10-20T18:00:00.000Z'),
  ...over,
});

const ctxDe = (papel: Papel, sub = 'psi-1') => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', nome: 'Dra. Ana Souza', jti: 'j', typ: 'access' as const },
});

function criar(over: { ag?: unknown; paciente?: boolean; crp?: string | undefined } = {}) {
  const documentos = {
    create: jest.fn(async (input: Record<string, unknown>) => ({ id: 'doc-1', ...input })),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const agendamentos = {
    obterParaEmissao: jest.fn().mockImplementation(async () => {
      if (over.ag === null) throw new NotFoundException('Agendamento nao encontrado.');
      return over.ag ?? agendamento();
    }),
  };
  const pacientes = {
    resumoPorIds: jest.fn().mockResolvedValue(over.paciente === false ? new Map() : new Map([['pac-1', { nome: 'Paciente Fictício' }]])),
  };
  const clinicas = { contextoDeEmissao: jest.fn().mockResolvedValue({ nome: 'Clínica Mente Sã', fusoHorario: 'America/Sao_Paulo' }) };
  const users = { findById: jest.fn().mockResolvedValue({ id: 'psi-1', crp: 'crp' in over ? over.crp : '06/12345' }) };
  const service = new DocumentosEmitidosService(
    documentos as never, auditLogs as never, agendamentos as never, pacientes as never, clinicas as never, users as never,
  );
  return { service, documentos, auditLogs, agendamentos, users };
}

const dto = { pacienteId: 'pac-1', agendamentoId: 'ag-1' };

describe('DocumentosEmitidosService – declaração de comparecimento', () => {
  it('monta o texto de PRESENÇA com data e hora do agendamento, no fuso da clínica', async () => {
    const { service } = criar();
    const doc = await service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'));
    expect(doc.corpo).toBe('Declaro, para os devidos fins, que Paciente Fictício esteve nesta clínica em 20/10/2026, das 14:00 às 15:00.');
    expect(doc.corpo).not.toMatch(/psicol[oó]gic|atendimento|atesto|sess[aã]o|terapia/i);
    expect(doc.atendimento).toEqual({ data: '20/10/2026', horaInicio: '14:00', horaFim: '15:00' });
  });

  it('assina por quem emite, sem CRP; devolve protocolo e nome da clínica', async () => {
    const { service } = criar();
    const doc = await service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'));
    expect(doc.emissor).toEqual({ nome: 'Dra. Ana Souza' });
    expect(doc.clinica.nome).toBe('Clínica Mente Sã');
    expect(doc.protocolo).toMatch(/^[A-Z0-9-]{8,}$/);
  });

  it.each([StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO, StatusAgendamento.CANCELADO, StatusAgendamento.FALTA])(
    'recusa (422) agendamento com status %s',
    async (status) => {
      const { service, documentos } = criar({ ag: agendamento({ status }) });
      await expect(service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(UnprocessableEntityException);
      expect(documentos.create).not.toHaveBeenCalled();
    },
  );

  it('recusa (404) agendamento inexistente/de outra clínica e agendamento de OUTRO paciente', async () => {
    const naoExiste = criar({ ag: null });
    await expect(naoExiste.service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(NotFoundException);
    const outroPaciente = criar({ ag: agendamento({ pacienteId: 'pac-2' }) });
    await expect(outroPaciente.service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(NotFoundException);
  });

  it('recusa (404) paciente que não é da clínica', async () => {
    const { service } = criar({ paciente: false });
    await expect(service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(NotFoundException);
  });

  it('registra a emissão (quem, quando, paciente, agendamento) e audita', async () => {
    const { service, documentos, auditLogs } = criar();
    await service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'));
    expect(documentos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: 'cli-1', pacienteId: 'pac-1', agendamentoId: 'ag-1', tipo: 'DECLARACAO_COMPARECIMENTO',
        emitidoPor: 'sec-1', protocolo: expect.any(String),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.DOCUMENT_ISSUED, userId: 'sec-1',
        metadata: expect.objectContaining({ tipo: 'DECLARACAO_COMPARECIMENTO', pacienteId: 'pac-1', agendamentoId: 'ag-1' }),
      }),
    );
  });

  it('o protocolo é diferente a cada emissão', async () => {
    const { service } = criar();
    const a = await service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'));
    const b = await service.emitirDeclaracao(dto, ctxDe(Papel.SECRETARIA, 'sec-1'));
    expect(a.protocolo).not.toBe(b.protocolo);
  });
});

describe('DocumentosEmitidosService – atestado de comparecimento (clínico)', () => {
  it('texto clínico com data/hora da agenda; assina com nome e CRP', async () => {
    const { service } = criar();
    const doc = await service.emitirAtestado(dto, ctxDe(Papel.PSICOLOGO));
    expect(doc.corpo).toBe('Atesto para os devidos fins que Paciente Fictício compareceu a atendimento psicológico em 20/10/2026, às 14:00.');
    expect(doc.emissor).toEqual({ nome: 'Dra. Ana Souza', crp: '06/12345' });
  });

  it('só psicólogo emite; sem CRP cadastrado → 422', async () => {
    await expect(criar().service.emitirAtestado(dto, ctxDe(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(ForbiddenException);
    const semCrp = criar({ crp: undefined });
    await expect(semCrp.service.emitirAtestado(dto, ctxDe(Papel.PSICOLOGO))).rejects.toThrow(UnprocessableEntityException);
    expect(semCrp.documentos.create).not.toHaveBeenCalled();
  });

  it('mesma regra da agenda: não concluído → 422; a posse é conferida pelo agendamento', async () => {
    const naoConcluido = criar({ ag: agendamento({ status: StatusAgendamento.AGENDADO }) });
    await expect(naoConcluido.service.emitirAtestado(dto, ctxDe(Papel.PSICOLOGO))).rejects.toThrow(UnprocessableEntityException);
    const { service, agendamentos } = criar();
    await service.emitirAtestado(dto, ctxDe(Papel.PSICOLOGO));
    expect(agendamentos.obterParaEmissao).toHaveBeenCalledWith('cli-1', 'ag-1', expect.objectContaining({ papel: Papel.PSICOLOGO }));
  });

  it('registra a emissão como ATESTADO_COMPARECIMENTO', async () => {
    const { service, documentos } = criar();
    await service.emitirAtestado(dto, ctxDe(Papel.PSICOLOGO));
    expect(documentos.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'ATESTADO_COMPARECIMENTO', emitidoPor: 'psi-1' }));
  });
});
