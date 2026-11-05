import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { TicketRequestContext, TicketsService } from './tickets.service';

/**
 * feature-tickets-superadmin (Red → Green). Os dtos entram como Record para permitir
 * casos inválidos (justificativa ausente, campos extras do cliente).
 */
function apiDe(service: TicketsService) {
  return {
    abrir: (dto: Record<string, unknown>, clinicaId: string | undefined, ctx: TicketRequestContext) =>
      service.abrir(dto as never, clinicaId, ctx),
    listarAbertos: (clinicaId: string | undefined, ctx: TicketRequestContext) => service.listarAbertos(clinicaId, ctx),
    listarPorPaciente: (pacienteId: string, clinicaId: string | undefined, ctx: TicketRequestContext) =>
      service.listarPorPaciente(pacienteId, clinicaId, ctx),
    atender: (id: string, dto: Record<string, unknown>, clinicaId: string | undefined, ctx: TicketRequestContext) =>
      service.atender(id, dto as never, clinicaId, ctx),
    recusar: (id: string, dto: Record<string, unknown>, clinicaId: string | undefined, ctx: TicketRequestContext) =>
      service.recusar(id, dto as never, clinicaId, ctx),
  };
}

const evento = (nome: keyof typeof AuditEvent): AuditEvent => AuditEvent[nome];

function contextDe(papel: Papel, sub = `${papel.toLowerCase()}-1`): TicketRequestContext {
  return {
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: { sub, email: `${sub}@nuvita.test`, papel, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' },
  };
}

const ticketAberto = {
  id: 'ticket-1',
  clinicaId: 'clinica-1',
  pacienteId: 'paciente-1',
  tipo: 'CORRECAO_IDENTIDADE',
  justificativa: 'CPF digitado incorretamente no cadastro inicial, correto é 11144477735',
  autorId: 'secretaria-1',
  status: 'ABERTO',
  abertoEm: new Date('2026-09-20T10:00:00.000Z'),
};

function repoPadrao() {
  return {
    criar: jest.fn().mockImplementation(async (input) => ({ id: 'ticket-novo', ...input })),
    buscarPorId: jest.fn().mockResolvedValue(ticketAberto),
    listar: jest.fn().mockResolvedValue([ticketAberto]),
    reservar: jest.fn().mockResolvedValue(ticketAberto),
    liberar: jest.fn().mockResolvedValue(undefined),
    resolver: jest.fn().mockImplementation(async (_c, _i, dados) => ({ ...ticketAberto, ...dados })),
  };
}

function pacientesPadrao() {
  return {
    resumoPorIds: jest.fn().mockResolvedValue(new Map([['paciente-1', { nome: 'Maria', nomeDestinatario: 'Maria', ehResponsavel: false }]])),
    corrigirIdentidade: jest.fn().mockResolvedValue({ id: 'paciente-1' }),
  };
}

function montar(overrides: { repo?: Record<string, jest.Mock>; pacientes?: Record<string, jest.Mock> } = {}) {
  const repo = { ...repoPadrao(), ...overrides.repo };
  const pacientes = { ...pacientesPadrao(), ...overrides.pacientes };
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const real = new TicketsService(repo as never, pacientes as never, { create: auditCreate } as never);
  return { service: apiDe(real), repo, pacientes, auditCreate };
}

const PAPEIS_ABREM = [Papel.ENFERMEIRO, Papel.SECRETARIA, Papel.ADMIN];

describe('TicketsService', () => {
  describe('abrir()', () => {
    it.each(PAPEIS_ABREM)('%s abre ticket com paciente + justificativa → cria ABERTO, autor = usuário autenticado, data do servidor', async (papel) => {
      const { service, repo } = montar();
      const antes = Date.now();

      await service.abrir({ pacienteId: 'paciente-1', justificativa: '  CPF errado, correto é 111  ' }, undefined, contextDe(papel));

      expect(repo.criar).toHaveBeenCalledTimes(1);
      const input = repo.criar.mock.calls[0][0];
      expect(input).toEqual(
        expect.objectContaining({
          clinicaId: 'clinica-1',
          pacienteId: 'paciente-1',
          tipo: 'CORRECAO_IDENTIDADE',
          justificativa: 'CPF errado, correto é 111',
          autorId: `${papel.toLowerCase()}-1`,
          status: 'ABERTO',
        }),
      );
      expect(input.abertoEm.getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('PACIENTE não abre ticket → 403', async () => {
      const { service, repo } = montar();

      await expect(
        service.abrir({ pacienteId: 'paciente-1', justificativa: 'x' }, undefined, contextDe(Papel.PACIENTE)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it.each([undefined, '', '   '])('justificativa %j → 400 e nada é gravado', async (justificativa) => {
      const { service, repo } = montar();

      await expect(
        service.abrir({ pacienteId: 'paciente-1', justificativa }, undefined, contextDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it('sem pacienteId → 400', async () => {
      const { service, repo } = montar();

      await expect(
        service.abrir({ justificativa: 'CPF errado' }, undefined, contextDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it('paciente fora da clínica do autor (ou inexistente) → 404 e nada é gravado', async () => {
      const { service, repo } = montar({ pacientes: { resumoPorIds: jest.fn().mockResolvedValue(new Map()) } });

      await expect(
        service.abrir({ pacienteId: 'paciente-de-outra-clinica', justificativa: 'CPF errado' }, undefined, contextDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it('status, autor e data enviados pelo cliente são ignorados — o servidor define', async () => {
      const { service, repo } = montar();

      await service.abrir(
        { pacienteId: 'paciente-1', justificativa: 'CPF errado', status: 'ATENDIDO', autorId: 'outro-usuario', abertoEm: '1999-01-01' },
        undefined,
        contextDe(Papel.SECRETARIA),
      );

      const input = repo.criar.mock.calls[0][0];
      expect(input.status).toBe('ABERTO');
      expect(input.autorId).toBe('secretaria-1');
      expect(input.abertoEm.getFullYear()).toBeGreaterThan(2000);
    });

    it('audita TICKET_OPENED só com ids — nunca o texto da justificativa', async () => {
      const { service, auditCreate } = montar();

      await service.abrir({ pacienteId: 'paciente-1', justificativa: 'CPF correto é 11144477735' }, undefined, contextDe(Papel.SECRETARIA));

      const entrada = auditCreate.mock.calls[0][0];
      expect(entrada.event).toBe(evento('TICKET_OPENED'));
      expect(entrada.metadata).toEqual(expect.objectContaining({ pacienteId: 'paciente-1' }));
      expect(JSON.stringify(entrada)).not.toContain('11144477735');
      expect(JSON.stringify(entrada)).not.toContain('CPF correto');
    });
  });

  describe('listagem', () => {
    it('SUPER_ADMIN lista tickets ABERTOS da clínica selecionada', async () => {
      const { service, repo } = montar();

      const r = await service.listarAbertos(undefined, contextDe(Papel.SUPER_ADMIN));

      expect(repo.listar).toHaveBeenCalledWith(expect.objectContaining({ clinicaId: 'clinica-1', status: 'ABERTO' }));
      expect(r).toHaveLength(1);
    });

    it.each(PAPEIS_ABREM)('%s não lista a fila do SUPER_ADMIN → 403', async (papel) => {
      const { service, repo } = montar();

      await expect(service.listarAbertos(undefined, contextDe(papel))).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.listar).not.toHaveBeenCalled();
    });

    it.each(PAPEIS_ABREM)('%s vê os tickets de UM paciente da própria clínica (para saber que a correção foi feita)', async (papel) => {
      const { service, repo } = montar();

      await service.listarPorPaciente('paciente-1', undefined, contextDe(papel));

      expect(repo.listar).toHaveBeenCalledWith(expect.objectContaining({ clinicaId: 'clinica-1', pacienteId: 'paciente-1' }));
    });
  });

  describe('atender() — executa a correção de identidade e fecha o ticket', () => {
    const dtoCorrecao = { cpf: '11144477735' };

    it('SUPER_ADMIN: chama corrigirIdentidade com ticketId, autor do ticket como solicitante e a justificativa do ticket; depois marca ATENDIDO com executor e data do servidor', async () => {
      const { service, repo, pacientes } = montar();
      const antes = Date.now();

      await service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN));

      expect(pacientes.corrigirIdentidade).toHaveBeenCalledTimes(1);
      const [pacienteId, dto, clinicaId] = pacientes.corrigirIdentidade.mock.calls[0];
      expect(pacienteId).toBe('paciente-1');
      expect(clinicaId).toBe('clinica-1');
      expect(dto).toEqual(
        expect.objectContaining({
          cpf: '11144477735',
          ticketId: 'ticket-1',
          solicitanteUserId: 'secretaria-1',
          justificativa: ticketAberto.justificativa,
        }),
      );

      expect(repo.resolver).toHaveBeenCalledTimes(1);
      const [, id, dados] = repo.resolver.mock.calls[0];
      expect(id).toBe('ticket-1');
      expect(dados).toEqual(expect.objectContaining({ status: 'ATENDIDO', resolvidoPor: 'super_admin-1' }));
      expect(dados.resolvidoEm.getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('a correção só é aplicada ANTES de fechar o ticket: se corrigirIdentidade falha (ex.: CPF duplicado), o ticket continua ABERTO', async () => {
      const { service, repo } = montar({ pacientes: { corrigirIdentidade: jest.fn().mockRejectedValue(new ConflictException('CPF duplicado')) } });

      await expect(service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it('a posse do ticket é tomada ANTES da correção: reservar → corrigirIdentidade → resolver, nessa ordem', async () => {
      const ordem: string[] = [];
      const { service } = montar({
        repo: {
          reservar: jest.fn().mockImplementation(async () => (ordem.push('reservar'), ticketAberto)),
          resolver: jest.fn().mockImplementation(async () => (ordem.push('resolver'), { ...ticketAberto, status: 'ATENDIDO' })),
        },
        pacientes: { corrigirIdentidade: jest.fn().mockImplementation(async () => (ordem.push('corrigir'), { id: 'paciente-1' })) },
      });

      await service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN));

      expect(ordem).toEqual(['reservar', 'corrigir', 'resolver']);
    });

    it('sem a posse (outro SUPER_ADMIN já reservou/resolveu) → 409 e corrigirIdentidade NÃO é chamado', async () => {
      const { service, pacientes, repo } = montar({ repo: { reservar: jest.fn().mockResolvedValue(null) } });

      await expect(service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(pacientes.corrigirIdentidade).not.toHaveBeenCalled();
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it('CORRIDA: dois SUPER_ADMINs atendem o mesmo ticket ao mesmo tempo — só um corrige; o outro recebe 409 e a correção roda uma única vez', async () => {
      let reservado = false;
      const { service, pacientes } = montar({
        repo: {
          // atômico como o findOneAndUpdate real: a 1ª chamada leva a posse, as demais não.
          reservar: jest.fn().mockImplementation(async () => {
            if (reservado) return null;
            reservado = true;
            return ticketAberto;
          }),
        },
      });

      const resultados = await Promise.allSettled([
        service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN, 'super-a')),
        service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN, 'super-b')),
      ]);

      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejeitado = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejeitado.reason).toBeInstanceOf(ConflictException);
      expect(pacientes.corrigirIdentidade).toHaveBeenCalledTimes(1);
    });

    it('correção que falha devolve a posse (liberar) e não fecha o ticket', async () => {
      const { service, repo } = montar({ pacientes: { corrigirIdentidade: jest.fn().mockRejectedValue(new ConflictException('CPF duplicado')) } });

      await expect(service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(repo.liberar).toHaveBeenCalledWith('clinica-1', 'ticket-1', 'super_admin-1');
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it.each(PAPEIS_ABREM)('%s não atende → 403 e nenhuma correção', async (papel) => {
      const { service, pacientes } = montar();

      await expect(service.atender('ticket-1', dtoCorrecao, undefined, contextDe(papel))).rejects.toBeInstanceOf(ForbiddenException);
      expect(pacientes.corrigirIdentidade).not.toHaveBeenCalled();
    });

    it.each(['ATENDIDO', 'RECUSADO'])('ticket já %s → 409 e nenhuma correção', async (status) => {
      const { service, pacientes, repo } = montar({ repo: { buscarPorId: jest.fn().mockResolvedValue({ ...ticketAberto, status }) } });

      await expect(service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(pacientes.corrigirIdentidade).not.toHaveBeenCalled();
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it('ticket inexistente ou de outra clínica → 404', async () => {
      const { service, pacientes } = montar({ repo: { buscarPorId: jest.fn().mockResolvedValue(null) } });

      await expect(service.atender('nao-existe', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(NotFoundException);
      expect(pacientes.corrigirIdentidade).not.toHaveBeenCalled();
    });

    it('audita TICKET_ATTENDED só com ids', async () => {
      const { service, auditCreate } = montar();

      await service.atender('ticket-1', dtoCorrecao, undefined, contextDe(Papel.SUPER_ADMIN));

      const entrada = auditCreate.mock.calls.map((c) => c[0]).find((e) => e.event === evento('TICKET_ATTENDED'));
      expect(entrada).toBeDefined();
      expect(entrada.metadata).toEqual(expect.objectContaining({ ticketId: 'ticket-1', pacienteId: 'paciente-1' }));
      expect(JSON.stringify(entrada)).not.toContain('11144477735');
    });
  });

  describe('recusar()', () => {
    it('SUPER_ADMIN com motivo → RECUSADO, motivo e data do servidor; NÃO chama corrigirIdentidade', async () => {
      const { service, repo, pacientes } = montar();

      await service.recusar('ticket-1', { motivo: 'CPF informado já está correto' }, undefined, contextDe(Papel.SUPER_ADMIN));

      expect(pacientes.corrigirIdentidade).not.toHaveBeenCalled();
      const [, id, dados] = repo.resolver.mock.calls[0];
      expect(id).toBe('ticket-1');
      expect(dados).toEqual(
        expect.objectContaining({ status: 'RECUSADO', motivoRecusa: 'CPF informado já está correto', resolvidoPor: 'super_admin-1' }),
      );
      expect(dados.resolvidoEm).toBeInstanceOf(Date);
    });

    it.each([undefined, '', '   '])('motivo %j → 400 e o ticket continua ABERTO', async (motivo) => {
      const { service, repo } = montar();

      await expect(service.recusar('ticket-1', { motivo }, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it('transição atômica: se o ticket deixou de estar ABERTO no meio (resolver devolve null) → 409', async () => {
      const { service } = montar({ repo: { resolver: jest.fn().mockResolvedValue(null) } });

      await expect(service.recusar('ticket-1', { motivo: 'x' }, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
    });

    it.each(PAPEIS_ABREM)('%s não recusa → 403', async (papel) => {
      const { service, repo } = montar();

      await expect(service.recusar('ticket-1', { motivo: 'x' }, undefined, contextDe(papel))).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it.each(['ATENDIDO', 'RECUSADO'])('ticket já %s → 409', async (status) => {
      const { service, repo } = montar({ repo: { buscarPorId: jest.fn().mockResolvedValue({ ...ticketAberto, status }) } });

      await expect(service.recusar('ticket-1', { motivo: 'x' }, undefined, contextDe(Papel.SUPER_ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(repo.resolver).not.toHaveBeenCalled();
    });

    it('audita TICKET_REFUSED só com ids — nunca o texto do motivo', async () => {
      const { service, auditCreate } = montar();

      await service.recusar('ticket-1', { motivo: 'o CPF 11144477735 já está correto' }, undefined, contextDe(Papel.SUPER_ADMIN));

      const entrada = auditCreate.mock.calls.map((c) => c[0]).find((e) => e.event === evento('TICKET_REFUSED'));
      expect(entrada).toBeDefined();
      expect(JSON.stringify(entrada)).not.toContain('11144477735');
    });
  });
});
