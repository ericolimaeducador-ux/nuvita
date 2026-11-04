import { UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { DocumentosEmitidosService } from './documentos-emitidos.service';

// Clínica sem CPF/CNPJ informado: o servidor não emite declaração nem atestado (o documento sai no cabeçalho).
const ctx = (papel: Papel, sub: string) => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', nome: 'Dra. Ana', jti: 'j', typ: 'access' as const },
});
const dto = { pacienteId: 'pac-1', agendamentoId: 'ag-1' };

function criar(documentoInformado: boolean) {
  const documentos = { create: jest.fn(async (i: Record<string, unknown>) => ({ id: 'doc-1', ...i })) };
  const ag = { id: 'ag-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1', status: StatusAgendamento.CONCLUIDO,
    dataHoraInicio: new Date(Date.now() - 3_600_000), dataHoraFim: new Date(Date.now() - 600_000) };
  const clinicas = {
    contextoDeEmissao: jest.fn().mockResolvedValue({ nome: 'Clínica', fusoHorario: 'America/Sao_Paulo' }),
    assertDocumentoInformado: jest.fn(async () => {
      if (!documentoInformado) throw new UnprocessableEntityException('Informe o CPF/CNPJ do consultório');
    }),
  };
  const service = new DocumentosEmitidosService(
    documentos as never, { create: jest.fn().mockResolvedValue(undefined) } as never,
    { obterParaEmissao: jest.fn().mockResolvedValue(ag) } as never,
    { resumoPorIds: jest.fn().mockResolvedValue(new Map([['pac-1', { nome: 'Paciente Fictício' }]])) } as never,
    clinicas as never,
    { findById: jest.fn().mockResolvedValue({ id: 'psi-1', coren: '06/12345' }) } as never,
  );
  return { service, documentos };
}

describe('emissão sem o documento do consultório', () => {
  it('declaração: 422 e nada é emitido', async () => {
    const { service, documentos } = criar(false);
    await expect(service.emitirDeclaracao(dto, ctx(Papel.SECRETARIA, 'sec-1'))).rejects.toThrow(new UnprocessableEntityException('Informe o CPF/CNPJ do consultório'));
    expect(documentos.create).not.toHaveBeenCalled();
  });
  it('atestado: 422 e nada é emitido', async () => {
    const { service, documentos } = criar(false);
    await expect(service.emitirAtestado(dto, ctx(Papel.ENFERMEIRO, 'psi-1'))).rejects.toThrow(new UnprocessableEntityException('Informe o CPF/CNPJ do consultório'));
    expect(documentos.create).not.toHaveBeenCalled();
  });
  it('com documento informado: emite', async () => {
    const { service } = criar(true);
    await expect(service.emitirDeclaracao(dto, ctx(Papel.SECRETARIA, 'sec-1'))).resolves.toBeDefined();
  });
});
