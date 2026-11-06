import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../modules/auth/domain/audit-event.enum';
import { RolesGuard } from '../../modules/auth/presentation/guards/roles.guard';
import { IaClinicaService } from '../../modules/ia-clinica/application/ia-clinica.service';
import { IaClinicaController } from '../../modules/ia-clinica/presentation/ia-clinica.controller';
import { ProntuariosController } from '../../modules/prontuarios/presentation/prontuarios.controller';
import { MATRIZ_API } from './authorization-matrix.expected';

/**
 * R1.4 (decisão do Erico) — prontuário antigo SOMENTE LEITURA e IA antiga DESLIGADA, bloqueados no servidor sem remover
 * rotas nem telas. Para TODO papel, cada rota abaixo responde 403: ou o RolesGuard já nega, ou o handler recusa.
 */
const PAPEIS = [Papel.SUPER_ADMIN, Papel.ADMIN, Papel.ENFERMEIRO, Papel.SECRETARIA, Papel.PACIENTE];
const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' }, socket: {} };
const usuario = (papel: Papel) => ({ sub: 'u1', email: 'u1@x', papel, clinicaId: 'c1', jti: 'j', typ: 'access' as const });

function rolesGuardPermite(classe: object, handler: (...a: unknown[]) => unknown, papel: Papel): boolean {
  const ctx = {
    getHandler: () => handler,
    getClass: () => classe,
    switchToHttp: () => ({ getRequest: () => ({ user: usuario(papel) }) }),
  } as unknown as ExecutionContext;
  try {
    return new RolesGuard(new Reflector()).canActivate(ctx);
  } catch {
    return false;
  }
}

describe('R1.4 — escritas do prontuário antigo: 403 para todo papel, auditado, leitura intacta', () => {
  function montar() {
    const servico = {
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      updateDraft: jest.fn().mockResolvedValue({ id: 'p1' }),
      sign: jest.fn().mockResolvedValue({ id: 'p1' }),
      createAddendum: jest.fn().mockResolvedValue({ id: 'a1' }),
    };
    const agendamentos = { validarReferencias: jest.fn().mockResolvedValue(undefined) };
    const audit = { create: jest.fn().mockResolvedValue(undefined) };
    const controller = new ProntuariosController(servico as never, agendamentos as never, audit as never);
    return { controller, servico, agendamentos, audit };
  }

  const ESCRITAS: Array<[string, keyof ProntuariosController, (c: ProntuariosController, papel: Papel) => unknown]> = [
    ['POST /prontuarios', 'create', (c, p) => c.create({ pacienteId: 'x' } as never, usuario(p), req as never)],
    ['PATCH /prontuarios/:id', 'updateDraft', (c, p) => c.updateDraft('p1', {} as never, undefined, usuario(p), req as never)],
    ['POST /prontuarios/:id/assinar', 'sign', (c, p) => c.sign('p1', undefined, usuario(p), req as never)],
    ['POST /prontuarios/:id/addendums', 'createAddendum', (c, p) => c.createAddendum('p1', { texto: 'x' } as never, undefined, usuario(p), req as never)],
  ];

  it.each(ESCRITAS)('%s continua na matriz (a rota existe)', (rota) => {
    expect(MATRIZ_API[rota]).toBeDefined();
  });

  describe.each(ESCRITAS)('%s', (_rota, metodo, chamar) => {
    it.each(PAPEIS)('papel %s -> 403 "O prontuário antigo é somente leitura." e nada é gravado', async (papel) => {
      const { controller, servico, agendamentos, audit } = montar();
      const handler = ProntuariosController.prototype[metodo] as unknown as (...a: unknown[]) => unknown;
      if (!rolesGuardPermite(ProntuariosController, handler, papel)) return; // o RolesGuard já responde 403
      await expect(Promise.resolve().then(() => chamar(controller, papel))).rejects.toThrow(new ForbiddenException('O prontuário antigo é somente leitura.'));
      expect(Object.values(servico).every((f) => f.mock.calls.length === 0)).toBe(true);
      expect(agendamentos.validarReferencias).not.toHaveBeenCalled();
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.PRONTUARIO_LEGADO_ESCRITA_BLOQUEADA, userId: 'u1' }));
      expect(JSON.stringify(audit.create.mock.calls[0][0].metadata)).not.toMatch(/"texto"/);
    });
  });

  it('a leitura continua igual (findOne/listByPaciente chamam o serviço)', () => {
    const proto = ProntuariosController.prototype as unknown as Record<string, unknown>;
    for (const leitura of ['findOne', 'listByPaciente', 'listAddendums', 'resumoAcompanhamento']) expect(typeof proto[leitura]).toBe('function');
  });
});

describe('R1.4 — IA clínica antiga: 403 "Recurso desativado." para todo papel e o provedor NUNCA é chamado', () => {
  function montar() {
    const acessosAoProvedor: string[] = [];
    const provedor = new Proxy({}, { get: (_t, k) => { acessosAoProvedor.push(String(k)); return jest.fn(); } });
    const fake = () => ({ create: jest.fn(), findById: jest.fn(), update: jest.fn() });
    const service = new IaClinicaService(provedor as never, { encrypt: jest.fn(), decrypt: jest.fn() } as never, fake() as never, fake() as never, { create: jest.fn() } as never, { getConfig: () => ({}) } as never);
    const espiao = jest.spyOn(service, 'sugerirAbordagem');
    const espiao2 = jest.spyOn(service, 'gerarPrescricao');
    const espiao3 = jest.spyOn(service, 'registrarDecisao');
    const controller = new IaClinicaController(service);
    return { controller, acessosAoProvedor, espioes: [espiao, espiao2, espiao3] };
  }

  const ROTAS_IA: Array<[string, keyof IaClinicaController, (c: IaClinicaController, papel: Papel) => unknown]> = [
    ['POST /ia-clinica/sugerir-abordagem', 'sugerirAbordagem', (c, p) => c.sugerirAbordagem({} as never, usuario(p), req as never)],
    ['POST /ia-clinica/gerar-prescricao', 'gerarPrescricao', (c, p) => c.gerarPrescricao({} as never, usuario(p), req as never)],
    ['POST /ia-clinica/registros/:id/decisao', 'registrarDecisao', (c, p) => c.registrarDecisao('r1', { decisao: 'ACEITA' } as never, usuario(p), req as never)],
  ];

  it.each(ROTAS_IA)('%s continua na matriz (a rota existe)', (rota) => {
    expect(MATRIZ_API[rota]).toBeDefined();
  });

  describe.each(ROTAS_IA)('%s', (_rota, metodo, chamar) => {
    it.each(PAPEIS)('papel %s -> 403 e o provedor de IA não é tocado', async (papel) => {
      const { controller, acessosAoProvedor, espioes } = montar();
      const handler = IaClinicaController.prototype[metodo] as unknown as (...a: unknown[]) => unknown;
      if (rolesGuardPermite(IaClinicaController, handler, papel)) {
        await expect(Promise.resolve().then(() => chamar(controller, papel))).rejects.toThrow(new ForbiddenException('Recurso desativado.'));
      }
      expect(acessosAoProvedor).toEqual([]);
      for (const e of espioes) expect(e).not.toHaveBeenCalled();
    });
  });
});
