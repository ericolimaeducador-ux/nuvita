import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { Paciente } from '../domain/paciente.entity';
import { PacienteRepository } from './ports/paciente.repository';
import { PacientesService, RequestAuditContext } from './pacientes.service';

/**
 * feature-correcao-identidade-paciente (Red → Green). Os dtos entram como Record
 * para permitir casos inválidos (justificativa ausente, campo extra do cliente).
 */
function corrigirVia(service: PacientesService) {
  return {
    corrigirIdentidade: (
      pacienteId: string,
      dto: Record<string, unknown>,
      clinicaId: string | undefined,
      context: RequestAuditContext,
    ) => service.corrigirIdentidade(pacienteId, dto as never, clinicaId, context),
  };
}

const EVENTO_CORRECAO = AuditEvent.PATIENT_IDENTITY_CORRECTED;

function contextDe(papel: Papel): RequestAuditContext {
  return {
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: {
      sub: `${papel.toLowerCase()}-1`,
      email: `${papel.toLowerCase()}@nuvita.test`,
      papel,
      clinicaId: 'clinica-1',
      jti: 'jti',
      typ: 'access',
    },
  };
}

const pacienteAtual: Paciente = {
  id: 'paciente-1',
  clinicaId: 'clinica-1',
  nome: 'Maria da Silva',
  cpf: '52998224725',
  dataNascimento: new Date('1990-05-10T00:00:00.000Z'),
  telefone: '11999998888',
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
};

function montar(repo: Record<string, jest.Mock>) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const service = new PacientesService(
    repo as unknown as PacienteRepository,
    { create: auditCreate } as never,
  );
  return { service, correcao: corrigirVia(service), auditCreate };
}

const repoPadrao = () => ({
  findById: jest.fn().mockResolvedValue(pacienteAtual),
  update: jest.fn().mockResolvedValue(pacienteAtual),
  corrigirIdentidade: jest.fn().mockResolvedValue({ ...pacienteAtual, cpf: '11144477735' }),
});

const PAPEIS_NAO_SUPER = [Papel.SECRETARIA, Papel.ENFERMEIRO, Papel.ADMIN];

describe('Correção de identidade do paciente', () => {
  describe('update() — fluxo normal não altera mais nome/CPF/data de nascimento', () => {
    it.each(PAPEIS_NAO_SUPER)('%s alterando o CPF → 403 e nada é gravado', async (papel) => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await expect(
        service.update('paciente-1', { cpf: '11144477735' } as never, undefined, contextDe(papel)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it.each(['nome', 'dataNascimento'])('%s alterado por SECRETARIA → 403 e nada é gravado', async (campo) => {
      const repo = repoPadrao();
      const { service } = montar(repo);
      const valor = campo === 'nome' ? 'Maria Souza' : '1991-01-01';

      await expect(
        service.update('paciente-1', { [campo]: valor } as never, undefined, contextDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN também não altera identidade pelo update() — precisa passar pela correção com justificativa', async () => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await expect(
        service.update('paciente-1', { cpf: '11144477735' } as never, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('[regressão — passa de graça antes do Green] outros campos continuam editáveis', async () => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await service.update('paciente-1', { telefone: '11888887777' } as never, undefined, contextDe(Papel.SECRETARIA));

      expect(repo.update).toHaveBeenCalledWith('clinica-1', 'paciente-1', expect.objectContaining({ telefone: '11888887777' }));
    });

    it('[regressão — passa de graça antes do Green] reenviar nome/CPF iguais aos salvos não conta como alteração', async () => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await service.update(
        'paciente-1',
        { nome: 'Maria da Silva', cpf: '52998224725', telefone: '11888887777' } as never,
        undefined,
        contextDe(Papel.SECRETARIA),
      );

      expect(repo.update).toHaveBeenCalled();
    });

    it('reenviar o CPF igual ao salvo, só que formatado (000.000.000-00), não conta como alteração', async () => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await service.update(
        'paciente-1',
        { cpf: '529.982.247-25', telefone: '11888887777' } as never,
        undefined,
        contextDe(Papel.SECRETARIA),
      );

      expect(repo.update).toHaveBeenCalled();
    });

    it('CPF formatado DIFERENTE do salvo continua sendo alteração → 403', async () => {
      const repo = repoPadrao();
      const { service } = montar(repo);

      await expect(
        service.update('paciente-1', { cpf: '111.444.777-35' } as never, undefined, contextDe(Papel.SECRETARIA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('corrigirIdentidade() — autorização e validação', () => {
    it.each(PAPEIS_NAO_SUPER)('%s → 403 e nada é gravado', async (papel) => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);

      await expect(
        correcao.corrigirIdentidade('paciente-1', { cpf: '11144477735', justificativa: 'CPF digitado errado' }, undefined, contextDe(papel)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.corrigirIdentidade).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it.each([undefined, '', '   '])('justificativa %j → 400 e nada é gravado', async (justificativa) => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);

      await expect(
        correcao.corrigirIdentidade('paciente-1', { cpf: '11144477735', justificativa }, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.corrigirIdentidade).not.toHaveBeenCalled();
    });

    it('sem nenhum campo de identidade para corrigir → 400', async () => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);

      await expect(
        correcao.corrigirIdentidade('paciente-1', { justificativa: 'sem campo' }, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.corrigirIdentidade).not.toHaveBeenCalled();
    });

    it('paciente inexistente no tenant → 404', async () => {
      const repo = { ...repoPadrao(), findById: jest.fn().mockResolvedValue(null) };
      const { correcao } = montar(repo);

      await expect(
        correcao.corrigirIdentidade('paciente-x', { cpf: '11144477735', justificativa: 'ajuste' }, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('E11000 do CPF usa a mensagem de atualização (migrado de update(): a troca de CPF agora só existe na correção)', async () => {
      const erroCpf = Object.assign(new Error('E11000 ... cpfHash'), { code: 11000, keyPattern: { clinicaId: 1, cpfHash: 1 } });
      const repo = { ...repoPadrao(), corrigirIdentidade: jest.fn().mockRejectedValue(erroCpf) };
      const { correcao } = montar(repo);

      const chamada = correcao.corrigirIdentidade('paciente-1', { cpf: '11144477735', justificativa: 'ajuste' }, undefined, contextDe(Papel.SUPER_ADMIN));

      await expect(chamada).rejects.toBeInstanceOf(ConflictException);
      await expect(chamada).rejects.toThrow('Não é possível atualizar: já existe outro paciente com este CPF nesta clínica.');
    });

    it('nova data de nascimento que torna o paciente menor, sem responsável legal → 400 e nada é gravado (migrado de update())', async () => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);
      const menor = `${new Date().getFullYear() - 10}-06-15`;

      await expect(
        correcao.corrigirIdentidade('paciente-1', { dataNascimento: menor, justificativa: 'data de nascimento errada' }, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.corrigirIdentidade).not.toHaveBeenCalled();
    });

    it('CPF novo já usado por outro paciente (E11000) → 409 e nenhuma versão fica gravada como aplicada', async () => {
      const erroCpf = Object.assign(new Error('E11000 ... cpfHash'), { code: 11000, keyPattern: { clinicaId: 1, cpfHash: 1 } });
      const repo = { ...repoPadrao(), corrigirIdentidade: jest.fn().mockRejectedValue(erroCpf) };
      const { correcao, auditCreate } = montar(repo);

      await expect(
        correcao.corrigirIdentidade('paciente-1', { cpf: '11144477735', justificativa: 'ajuste' }, undefined, contextDe(Papel.SUPER_ADMIN)),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(auditCreate).not.toHaveBeenCalled();
    });
  });

  describe('corrigirIdentidade() — versão anterior, solicitante x executor e timestamp do servidor', () => {
    it('caminho feliz: delega ao repositório com os novos valores, justificativa, executor autenticado e data gerada no servidor, sem passar pelo update() de sobrescrita', async () => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);
      const antes = Date.now();

      await correcao.corrigirIdentidade(
        'paciente-1',
        { cpf: '11144477735', justificativa: 'CPF digitado errado no cadastro', executadoEm: '1999-01-01T00:00:00.000Z' },
        undefined,
        contextDe(Papel.SUPER_ADMIN),
      );

      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.corrigirIdentidade).toHaveBeenCalledTimes(1);
      const [clinicaId, pacienteId, input] = repo.corrigirIdentidade.mock.calls[0];
      expect(clinicaId).toBe('clinica-1');
      expect(pacienteId).toBe('paciente-1');
      expect(input).toEqual(
        expect.objectContaining({
          cpf: '11144477735',
          justificativa: 'CPF digitado errado no cadastro',
          executadoPor: 'super_admin-1',
        }),
      );
      // timestamp é do servidor: um valor enviado pelo cliente é ignorado.
      expect(input.executadoEm).toBeInstanceOf(Date);
      expect(input.executadoEm.getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('solicitante: com ticketId, registra o ticket; o executor continua sendo o SUPER_ADMIN autenticado', async () => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);

      await correcao.corrigirIdentidade(
        'paciente-1',
        { nome: 'Maria Souza', justificativa: 'nome com erro', ticketId: 'ticket-9', solicitanteUserId: 'secretaria-1' },
        undefined,
        contextDe(Papel.SUPER_ADMIN),
      );

      const input = repo.corrigirIdentidade.mock.calls[0][2];
      expect(input.ticketId).toBe('ticket-9');
      expect(input.solicitadoPor).toBe('secretaria-1');
      expect(input.executadoPor).toBe('super_admin-1');
    });

    it('solicitante: sem ticket nem solicitante informado, o solicitante é o próprio SUPER_ADMIN', async () => {
      const repo = repoPadrao();
      const { correcao } = montar(repo);

      await correcao.corrigirIdentidade('paciente-1', { nome: 'Maria Souza', justificativa: 'erro' }, undefined, contextDe(Papel.SUPER_ADMIN));

      const input = repo.corrigirIdentidade.mock.calls[0][2];
      expect(input.solicitadoPor).toBe('super_admin-1');
      expect(input.ticketId).toBeUndefined();
    });
  });

  describe('corrigirIdentidade() — auditoria sem dado de identificação', () => {
    it('audita PATIENT_IDENTITY_CORRECTED só com ids e nomes de campos: nunca valor antigo, valor novo nem o texto da justificativa', async () => {
      const repo = repoPadrao();
      const { correcao, auditCreate } = montar(repo);

      await correcao.corrigirIdentidade(
        'paciente-1',
        { cpf: '11144477735', nome: 'Maria Souza', justificativa: 'CPF correto é 11144477735, digitado errado', ticketId: 'ticket-9' },
        undefined,
        contextDe(Papel.SUPER_ADMIN),
      );

      expect(auditCreate).toHaveBeenCalledTimes(1);
      const entrada = auditCreate.mock.calls[0][0];
      expect(entrada.event).toBe(EVENTO_CORRECAO);
      expect(entrada.userId).toBe('super_admin-1');
      expect(entrada.metadata).toEqual(
        expect.objectContaining({ pacienteId: 'paciente-1', ticketId: 'ticket-9', campos: expect.arrayContaining(['cpf', 'nome']) }),
      );

      const serializado = JSON.stringify(entrada);
      for (const proibido of ['11144477735', '52998224725', 'Maria Souza', 'Maria da Silva', 'digitado errado']) {
        expect(serializado).not.toContain(proibido);
      }
    });
  });
});
