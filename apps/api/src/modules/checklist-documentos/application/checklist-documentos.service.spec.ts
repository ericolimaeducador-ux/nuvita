import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteRepository } from '../../pacientes/application/ports/paciente.repository';
import { ClassificacaoArea, Paciente } from '../../pacientes/domain/paciente.entity';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../domain/checklist-documento.entity';
import { ChecklistAuditContext, ChecklistDocumentosService } from './checklist-documentos.service';
import { ChecklistDocumentoRepository } from './ports/checklist-documento.repository';
import { CreateChecklistDocumentoDto } from './dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from './dto/update-checklist-documento.dto';

const PACIENTE_ID = '65f000000000000000000001';

const contexto: ChecklistAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'sec-1', email: 'sec@nuvita.test', papel: Papel.SECRETARIA, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' as const },
};

function item(over: Partial<ChecklistDocumentoItem> = {}): ChecklistDocumentoItem {
  return {
    id: 'i1', clinicaId: 'clinica-1', pacienteId: PACIENTE_ID, nome: 'Comprovante de endereço',
    status: StatusChecklistDocumento.PENDENTE, criadoPor: 'sec-1', criadoEm: new Date(), atualizadoEm: new Date(), ...over,
  };
}

function montar(repo: Partial<Record<keyof ChecklistDocumentoRepository, jest.Mock>>, existe = true) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const pacientes = {
    resumoPorIds: jest.fn().mockResolvedValue(existe ? new Map([[PACIENTE_ID, { nome: 'Maria' }]]) : new Map()),
    avancarEtapaFluxo: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ChecklistDocumentosService(
    repo as unknown as ChecklistDocumentoRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
  );
  return { service, auditCreate, pacientes };
}

describe('ChecklistDocumentosService — gatilho do fluxo clínico', () => {
  it('último item vira RECEBIDO (todos RECEBIDO) → AGUARDANDO_CONSULTA_MEDICA', async () => {
    const recebido = item({ status: StatusChecklistDocumento.RECEBIDO });
    const { service, pacientes } = montar({
      update: jest.fn().mockResolvedValue(recebido),
      listByPaciente: jest.fn().mockResolvedValue([recebido, item({ id: 'i2', status: StatusChecklistDocumento.RECEBIDO })]),
    });

    await service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto);

    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith(
      'clinica-1', PACIENTE_ID, EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
      { ip: '127.0.0.1', userAgent: 'jest', user: contexto.user },
    );
  });

  it('ainda há item pendente → não avança', async () => {
    const recebido = item({ status: StatusChecklistDocumento.RECEBIDO });
    const { service, pacientes } = montar({
      update: jest.fn().mockResolvedValue(recebido),
      listByPaciente: jest.fn().mockResolvedValue([recebido, item({ id: 'i2' })]),
    });

    await service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto);

    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
  });

  it('atualização que não é RECEBIDO (voltar a pendente / editar nome) → não avança', async () => {
    const { service, pacientes } = montar({
      update: jest.fn().mockResolvedValue(item()),
      listByPaciente: jest.fn().mockResolvedValue([]),
    });

    await service.update('i1', { status: StatusChecklistDocumento.PENDENTE }, contexto);
    await service.update('i1', { nome: 'Outro nome' }, contexto);

    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
  });

  it('item inexistente (ou de outra clínica) → 404 e o fluxo não é tocado', async () => {
    const { service, pacientes, auditCreate } = montar({ update: jest.fn().mockResolvedValue(null) });

    await expect(service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('o clinicaId do body não vai para o repositório como campo a gravar', async () => {
    const update = jest.fn().mockResolvedValue(item());
    const { service } = montar({ update, listByPaciente: jest.fn().mockResolvedValue([]) });

    await service.update('i1', { nome: 'Novo', clinicaId: 'clinica-1' }, contexto);

    expect(update).toHaveBeenCalledWith('clinica-1', 'i1', { nome: 'Novo' });
  });

  describe('com o PacientesService real (elegibilidade ao fluxo)', () => {
    function comPacienteReal(paciente: Paciente) {
      const updatePaciente = jest.fn().mockResolvedValue(paciente);
      const pacienteRepo = {
        findById: jest.fn().mockResolvedValue(paciente),
        findManyByIds: jest.fn().mockResolvedValue([paciente]),
        update: updatePaciente,
      } as unknown as PacienteRepository;
      const pacientesService = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository);
      const recebido = item({ pacienteId: paciente.id, status: StatusChecklistDocumento.RECEBIDO });
      const service = new ChecklistDocumentosService(
        {
          update: jest.fn().mockResolvedValue(recebido),
          listByPaciente: jest.fn().mockResolvedValue([recebido]),
        } as unknown as ChecklistDocumentoRepository,
        { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository,
        pacientesService,
      );
      return { service, updatePaciente };
    }

    const base: Paciente = {
      id: PACIENTE_ID, clinicaId: 'clinica-1', nome: 'Maria', ativo: true, criadoEm: new Date(), atualizadoEm: new Date(),
    };

    it('paciente elegível (exatamente [IU]) em APTO_AGUARDANDO_CONTATO avança para AGUARDANDO_CONSULTA_MEDICA', async () => {
      const { service, updatePaciente } = comPacienteReal({
        ...base, classificacoes: [ClassificacaoArea.IU], etapaFluxo: EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO,
      });

      await service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto);

      expect(updatePaciente).toHaveBeenCalledWith(
        'clinica-1', PACIENTE_ID, expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA }),
      );
    });

    it.each([
      ['[FA]', [ClassificacaoArea.FA], EtapaFluxoClinico.AVALIACAO_IU],
      ['[IU, FA] com etapa gravada', [ClassificacaoArea.IU, ClassificacaoArea.FA], EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO],
      ['[OT] sem etapa', [ClassificacaoArea.OT], undefined],
    ])('paciente fora do fluxo %s: o item é atualizado, mas a etapa NÃO muda', async (_nome, classificacoes, etapaFluxo) => {
      const { service, updatePaciente } = comPacienteReal({ ...base, classificacoes, etapaFluxo });

      const resultado = await service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto);

      expect(resultado.status).toBe(StatusChecklistDocumento.RECEBIDO);
      expect(updatePaciente).not.toHaveBeenCalled();
    });
  });
});

describe('ChecklistDocumentosService — referências, exclusão e auditoria', () => {
  it('criar: paciente de outra clínica → 404 e nada é gravado', async () => {
    const create = jest.fn();
    const { service } = montar({ create }, false);

    await expect(service.create({ pacienteId: PACIENTE_ID, nome: 'RG' }, contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('criar padrão: paciente de outra clínica → 404', async () => {
    const create = jest.fn();
    const { service } = montar({ create, listByPaciente: jest.fn().mockResolvedValue([]) }, false);

    await expect(service.criarPadrao({ pacienteId: PACIENTE_ID }, contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('criar padrão: só cria os itens que o paciente ainda não tem (por nome)', async () => {
    const create = jest.fn().mockImplementation((d) => Promise.resolve(item({ nome: d.nome })));
    const existente = item({ nome: '  comprovante de endereço ' });
    const { service, auditCreate } = montar({ create, listByPaciente: jest.fn().mockResolvedValue([existente]) });

    const lista = await service.criarPadrao({ pacienteId: PACIENTE_ID }, contexto);

    expect(create).toHaveBeenCalledTimes(5);
    expect(create.mock.calls.map((c) => c[0].nome)).not.toContain('Comprovante de endereço');
    expect(lista).toHaveLength(6);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.CHECKLIST_PADRAO_CREATED, metadata: expect.objectContaining({ itensCriados: 5 }) }),
    );
  });

  it('criar audita só ids (sem nome do documento nem observação)', async () => {
    const { service, auditCreate } = montar({ create: jest.fn().mockResolvedValue(item()) });

    await service.create({ pacienteId: PACIENTE_ID, nome: 'RG do Fulano', observacao: 'obs sensível' }, contexto);

    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.CHECKLIST_ITEM_CREATED);
    expect(JSON.stringify(chamada.metadata)).not.toMatch(/Fulano|sensível/);
  });

  it('marcar RECEBIDO audita CHECKLIST_ITEM_RECEBIDO; outra edição audita CHECKLIST_ITEM_UPDATED', async () => {
    const { service, auditCreate } = montar({
      update: jest.fn().mockResolvedValue(item()),
      listByPaciente: jest.fn().mockResolvedValue([item()]),
    });

    await service.update('i1', { status: StatusChecklistDocumento.RECEBIDO }, contexto);
    await service.update('i1', { observacao: 'x' }, contexto);

    expect(auditCreate.mock.calls.map((c) => c[0].event)).toEqual([
      AuditEvent.CHECKLIST_ITEM_RECEBIDO,
      AuditEvent.CHECKLIST_ITEM_UPDATED,
    ]);
  });

  it('excluir é lógico (softDelete), audita e 404 quando não existe', async () => {
    const softDelete = jest.fn().mockResolvedValueOnce(item()).mockResolvedValueOnce(null);
    const { service, auditCreate } = montar({ softDelete });

    await expect(service.delete('i1', undefined, contexto)).resolves.toEqual({ ok: true });
    expect(softDelete).toHaveBeenCalledWith('clinica-1', 'i1', 'sec-1');
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.CHECKLIST_ITEM_DELETED }));
    await expect(service.delete('i1', undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listar exige pacienteId e usa a clínica do token', async () => {
    const listByPaciente = jest.fn().mockResolvedValue([]);
    const { service } = montar({ listByPaciente });

    await expect(service.listByPaciente('', undefined, contexto.user)).rejects.toThrow();
    await service.listByPaciente(PACIENTE_ID, undefined, contexto.user);
    expect(listByPaciente).toHaveBeenCalledWith('clinica-1', PACIENTE_ID);
    await expect(service.listByPaciente(PACIENTE_ID, 'outra-clinica', contexto.user)).rejects.toThrow();
  });
});

describe('DTOs do checklist', () => {
  const opcoes = { whitelist: true, forbidNonWhitelisted: true };
  const erros = async (cls: new () => object, dados: Record<string, unknown>) =>
    (await validate(plainToInstance(cls, dados), opcoes)).map((e) => e.property);

  it('criar: aceita válido; recusa pacienteId que não é ObjectId, nome curto e campo desconhecido', async () => {
    expect(await erros(CreateChecklistDocumentoDto, { pacienteId: PACIENTE_ID, nome: 'RG' })).toEqual([]);
    expect(await erros(CreateChecklistDocumentoDto, { pacienteId: 'abc', nome: 'RG' })).toContain('pacienteId');
    expect(await erros(CreateChecklistDocumentoDto, { pacienteId: PACIENTE_ID, nome: 'R' })).toContain('nome');
    expect(await erros(CreateChecklistDocumentoDto, { pacienteId: PACIENTE_ID, nome: 'RG', status: 'recebido' })).toContain('status');
  });

  it('atualizar: status só pendente/recebido', async () => {
    expect(await erros(UpdateChecklistDocumentoDto, { status: 'recebido' })).toEqual([]);
    expect(await erros(UpdateChecklistDocumentoDto, { status: 'qualquer' })).toContain('status');
  });
});
