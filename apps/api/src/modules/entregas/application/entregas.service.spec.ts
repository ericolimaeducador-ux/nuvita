import { NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteRepository } from '../../pacientes/application/ports/paciente.repository';
import { ClassificacaoArea, Paciente } from '../../pacientes/domain/paciente.entity';
import { EmbalagemProduto, Produto, ProjetoCatalogo, SexoProduto, TipoProduto } from '../../produtos/domain/produto.entity';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { EntregaRepository } from './ports/entrega.repository';
import { EntregaAuditContext, EntregasService } from './entregas.service';
import { CreateEntregaDto } from './dto/create-entrega.dto';
import { Entrega, OrigemEntrega, StatusEntrega } from '../domain/entrega.entity';

const contexto: EntregaAuditContext = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: {
    sub: 'enfermeiro-1',
    email: 'enfermeiro@nuvita.test',
    papel: Papel.ENFERMEIRO,
    clinicaId: 'clinica-1',
    jti: 'jti',
    typ: 'access' as const,
  },
};

function produto(overrides: Partial<Produto>): Produto {
  return {
    id: 'produto-1',
    codigo: 100,
    nome: 'Produto',
    tipo: TipoProduto.CATETER_VAPRO,
    sexo: SexoProduto.UNIVERSAL,
    embalagem: EmbalagemProduto.STANDARD,
    projeto: ProjetoCatalogo.ALPHA,
    descricaoTecnica: '',
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

function baseDto(codigo: number): CreateEntregaDto {
  return {
    pacienteId: 'paciente-1',
    dataEntrega: '2026-01-01',
    origem: OrigemEntrega.SUS,
    itens: [{ codigo, descricao: 'Item', quantidade: 2, valorUnitarioCentavos: 100, valorTotalCentavos: 200 }],
    valorTotalCentavos: 200,
  };
}

/** PacientesService mínimo: o paciente "existe" na clínica (resumoPorIds) e avancarEtapaFluxo é espionado. */
function pacientesFake(existe = true) {
  return {
    resumoPorIds: jest.fn().mockResolvedValue(existe ? new Map([['paciente-1', { nome: 'Maria' }]]) : new Map()),
    avancarEtapaFluxo: jest.fn().mockResolvedValue(undefined),
  };
}

function montar(repo: Record<string, jest.Mock>, buscarPorCodigo: jest.Mock, pacientes = pacientesFake()) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const service = new EntregasService(
    repo as unknown as EntregaRepository,
    { create: auditCreate } as unknown as AuditLogRepository,
    pacientes as unknown as PacientesService,
    { buscarPorCodigo } as unknown as ProdutosService,
  );
  return { service, auditCreate, pacientes };
}

describe('EntregasService.create', () => {
  it('categoriza item de cateter (VAPRO) como sonda', async () => {
    const create = jest.fn().mockImplementation((data) => ({ id: 'e1', ...data }));
    const { service } = montar({ create }, jest.fn().mockResolvedValue(produto({ codigo: 100, tipo: TipoProduto.CATETER_VAPRO })));

    const entrega = await service.create(baseDto(100), contexto);

    expect(entrega.itens[0].categoria).toBe('sonda');
  });

  it('categoriza item de coletor (ACTICOAT) como coletor', async () => {
    const create = jest.fn().mockImplementation((data) => ({ id: 'e1', ...data }));
    const { service } = montar({ create }, jest.fn().mockResolvedValue(produto({ codigo: 200, tipo: TipoProduto.COLETOR_ACTICOAT })));

    const entrega = await service.create(baseDto(200), contexto);

    expect(entrega.itens[0].categoria).toBe('coletor');
  });

  it('não quebra e deixa sem categoria quando o código não corresponde a nenhum produto', async () => {
    const create = jest.fn().mockImplementation((data) => ({ id: 'e1', ...data }));
    const { service } = montar({ create }, jest.fn().mockResolvedValue(null));

    const entrega = await service.create(baseDto(999), contexto);

    expect(entrega.itens[0].categoria).toBeUndefined();
  });

  it('grava na clínica do TOKEN, com o responsável do token e status PENDENTE; audita ENTREGA_CREATED só com ids', async () => {
    const create = jest.fn().mockImplementation((data) => ({ id: 'e1', ...data }));
    const { service, auditCreate } = montar({ create }, jest.fn().mockResolvedValue(null));

    await service.create({ ...baseDto(1), notaFiscal: 'NF-123', observacoes: 'texto livre' }, contexto);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ clinicaId: 'clinica-1', responsavelId: 'enfermeiro-1', status: StatusEntrega.PENDENTE }),
    );
    const chamada = auditCreate.mock.calls[0][0];
    expect(chamada.event).toBe(AuditEvent.ENTREGA_CREATED);
    expect(chamada.metadata).toEqual({ clinicaId: 'clinica-1', entregaId: 'e1', pacienteId: 'paciente-1', origem: 'sus', itens: 1 });
    expect(JSON.stringify(chamada.metadata)).not.toMatch(/NF-123|texto livre/);
  });

  it('paciente que não é da clínica → 404 e nada é gravado', async () => {
    const create = jest.fn();
    const { service } = montar({ create }, jest.fn(), pacientesFake(false));

    await expect(service.create(baseDto(1), contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('clinicaId do payload diferente do token é recusado (403)', async () => {
    const create = jest.fn();
    const { service } = montar({ create }, jest.fn());

    await expect(service.create({ ...baseDto(1), clinicaId: 'outra-clinica' }, contexto)).rejects.toThrow(/tenant/i);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('EntregasService.confirmarEntrega — gatilho do fluxo clínico', () => {
  const entregue = (pacienteId = 'paciente-1') =>
    ({ id: 'e1', clinicaId: 'clinica-1', pacienteId, status: StatusEntrega.ENTREGUE }) as Entrega;

  it('marca ENTREGUE, audita ENTREGA_CONFIRMED e pede CONCLUIDO ao PacientesService.avancarEtapaFluxo', async () => {
    const updateStatus = jest.fn().mockResolvedValue(entregue());
    const { service, auditCreate, pacientes } = montar({ updateStatus }, jest.fn());

    await service.confirmarEntrega('e1', undefined, contexto);

    expect(updateStatus).toHaveBeenCalledWith('clinica-1', 'e1', StatusEntrega.ENTREGUE);
    expect(auditCreate.mock.calls[0][0]).toMatchObject({
      event: AuditEvent.ENTREGA_CONFIRMED,
      metadata: { clinicaId: 'clinica-1', entregaId: 'e1', pacienteId: 'paciente-1' },
    });
    expect(pacientes.avancarEtapaFluxo).toHaveBeenCalledWith(
      'clinica-1',
      'paciente-1',
      EtapaFluxoClinico.CONCLUIDO,
      expect.objectContaining({ user: contexto.user }),
    );
  });

  it('entrega inexistente (ou de outra clínica) → 404 e o fluxo não é tocado', async () => {
    const { service, pacientes } = montar({ updateStatus: jest.fn().mockResolvedValue(null) }, jest.fn());

    await expect(service.confirmarEntrega('e1', undefined, contexto)).rejects.toBeInstanceOf(NotFoundException);
    expect(pacientes.avancarEtapaFluxo).not.toHaveBeenCalled();
  });

  describe('com o PacientesService real (elegibilidade ao fluxo)', () => {
    function comPacienteReal(paciente: Paciente) {
      const update = jest.fn().mockResolvedValue(paciente);
      const pacienteRepo = { findById: jest.fn().mockResolvedValue(paciente), update } as unknown as PacienteRepository;
      const pacientesService = new PacientesService(pacienteRepo, { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository);
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const service = new EntregasService(
        { updateStatus: jest.fn().mockResolvedValue(entregue()) } as unknown as EntregaRepository,
        { create: auditCreate } as unknown as AuditLogRepository,
        pacientesService,
        {} as unknown as ProdutosService,
      );
      return { service, update };
    }

    const base: Paciente = {
      id: 'paciente-1',
      clinicaId: 'clinica-1',
      nome: 'Maria',
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    it('paciente elegível (exatamente [IU]) em AGUARDANDO_ENTREGA vai para CONCLUIDO', async () => {
      const { service, update } = comPacienteReal({
        ...base,
        classificacoes: [ClassificacaoArea.IU],
        etapaFluxo: EtapaFluxoClinico.AGUARDANDO_ENTREGA,
      });

      await service.confirmarEntrega('e1', undefined, contexto);

      expect(update).toHaveBeenCalledWith('clinica-1', 'paciente-1', expect.objectContaining({ etapaFluxo: EtapaFluxoClinico.CONCLUIDO }));
    });

    it.each([
      ['[FA]', [ClassificacaoArea.FA], EtapaFluxoClinico.AVALIACAO_IU],
      ['[IU, FA] com etapa gravada', [ClassificacaoArea.IU, ClassificacaoArea.FA], EtapaFluxoClinico.AGUARDANDO_ENTREGA],
      ['[OT] sem etapa', [ClassificacaoArea.OT], undefined],
    ])('paciente fora do fluxo %s: a entrega confirma, mas a etapa NÃO muda', async (_nome, classificacoes, etapaFluxo) => {
      const { service, update } = comPacienteReal({ ...base, classificacoes, etapaFluxo });

      const resultado = await service.confirmarEntrega('e1', undefined, contexto);

      expect(resultado.status).toBe(StatusEntrega.ENTREGUE);
      expect(update).not.toHaveBeenCalled();
    });

    it('paciente elegível que já está CONCLUIDO não regride nem repete', async () => {
      const { service, update } = comPacienteReal({
        ...base,
        classificacoes: [ClassificacaoArea.IU],
        etapaFluxo: EtapaFluxoClinico.CONCLUIDO,
      });

      await service.confirmarEntrega('e1', undefined, contexto);

      expect(update).not.toHaveBeenCalled();
    });
  });
});

describe('EntregasService.listByPaciente', () => {
  it('exige pacienteId e lista pela clínica do token', async () => {
    const listByPaciente = jest.fn().mockResolvedValue([]);
    const { service } = montar({ listByPaciente }, jest.fn());

    await expect(service.listByPaciente('', undefined, contexto.user)).rejects.toThrow(/pacienteId/);
    await service.listByPaciente('paciente-1', undefined, contexto.user);
    expect(listByPaciente).toHaveBeenCalledWith('clinica-1', 'paciente-1');
  });
});
