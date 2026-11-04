import 'reflect-metadata';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../../../../packages/shared/src/auth';
import { RolesGuard } from '../../modules/auth/presentation/guards/roles.guard';
import { MATRIZ_API, PapelSigla, SIGLA_PAPEL } from './authorization-matrix.expected';

import { AgendamentosController } from '../../modules/agendamentos/presentation/agendamentos.controller';
import { AnalyticsController } from '../../modules/analytics/presentation/analytics.controller';
import { AuthController } from '../../modules/auth/presentation/auth.controller';
import { PasswordResetController } from '../../modules/auth/presentation/password-reset.controller';
import { ClinicaDocumentoController } from '../../modules/clinicas/presentation/clinica-documento.controller';
import { ClinicasController } from '../../modules/clinicas/presentation/clinicas.controller';
import { DocumentosController } from '../../modules/documentos/presentation/documentos.controller';
import { DocumentosEmitidosController } from '../../modules/documentos-emitidos/presentation/documentos-emitidos.controller';
import { FinanceiroController } from '../../modules/financeiro/presentation/financeiro.controller';
import { PsicologiaFinanceiroController } from '../../modules/financeiro/presentation/psicologia-financeiro.controller';
import { HealthController } from '../../modules/health/health.controller';
import { IaClinicaController } from '../../modules/ia-clinica/presentation/ia-clinica.controller';
import { InscricoesTesteController } from '../../modules/inscricoes-teste/presentation/inscricoes-teste.controller';
import { LembretesAgendamentoController } from '../../modules/lembretes-agendamento/presentation/lembretes-agendamento.controller';
import { NotificacoesController } from '../../modules/notificacoes/presentation/notificacoes.controller';
import { ObservacoesPacienteController } from '../../modules/observacoes-paciente/presentation/observacoes-paciente.controller';
import { PacientesController } from '../../modules/pacientes/presentation/pacientes.controller';
import { ProntuariosController } from '../../modules/prontuarios/presentation/prontuarios.controller';
import { SuperAdminController } from '../../modules/super-admin/super-admin.controller';
import { TelemedicinaController } from '../../modules/telemedicina/presentation/telemedicina.controller';
import { TelemedicinaAcessoController } from '../../modules/telemedicina/presentation/telemedicina-acesso.controller';
import { TestesPsicologicosController } from '../../modules/testes-psicologicos/presentation/testes-psicologicos.controller';
import { TicketsController } from '../../modules/tickets/presentation/tickets.controller';

/**
 * MATRIZ DE AUTORIZAÇÃO (papel × endpoint). Para cada rota HTTP de cada controller o teste:
 *  1. exige que a rota esteja declarada em `MATRIZ_API` (rota nova sem declaração = teste vermelho:
 *     negação por padrão, esconder no menu nunca é a proteção);
 *  2. tenta o acesso com cada um dos 5 papéis, executando o RolesGuard REAL com os metadados REAIS do
 *     handler, e compara com o esperado.
 * Rotas sem RolesGuard só são aceitas se a matriz as marcar explicitamente (PUBLICO / LOGADO / ...).
 */
const CONTROLLERS = [
  AgendamentosController, AnalyticsController, AuthController, PasswordResetController, ClinicasController, ClinicaDocumentoController, DocumentosController,
  DocumentosEmitidosController,
  FinanceiroController, PsicologiaFinanceiroController, HealthController, IaClinicaController,
  InscricoesTesteController, LembretesAgendamentoController, NotificacoesController,
  ObservacoesPacienteController, PacientesController, ProntuariosController, SuperAdminController,
  TelemedicinaController, TelemedicinaAcessoController, TestesPsicologicosController, TicketsController,
];

const PAPEIS: Papel[] = [Papel.SUPER_ADMIN, Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA, Papel.PACIENTE];

interface RotaDescoberta {
  chave: string;
  handler: (...args: unknown[]) => unknown;
  classe: new (...args: never[]) => unknown;
  guards: string[];
}

function guardsDe(alvo: object): Array<{ name: string }> {
  return (Reflect.getMetadata('__guards__', alvo) ?? []) as Array<{ name: string }>;
}

function descobrir(): RotaDescoberta[] {
  const rotas: RotaDescoberta[] = [];
  for (const classe of CONTROLLERS) {
    const base = String(Reflect.getMetadata('path', classe) ?? '').replace(/^\/|\/$/g, '');
    const proto = (classe as unknown as { prototype: Record<string, unknown> }).prototype;
    for (const nome of Object.getOwnPropertyNames(proto)) {
      const handler = proto[nome];
      if (nome === 'constructor' || typeof handler !== 'function') continue;
      const metodo = Reflect.getMetadata('method', handler as object);
      if (metodo === undefined) continue;
      const caminho = String(Reflect.getMetadata('path', handler as object) ?? '').replace(/^\/|\/$/g, '');
      const verbo = RequestMethod[metodo as number];
      const chave = `${verbo} /${[base, caminho].filter(Boolean).join('/')}`;
      const guards = [...guardsDe(classe), ...guardsDe(handler as object)].map((g) => g.name);
      rotas.push({ chave, handler: handler as RotaDescoberta['handler'], classe: classe as RotaDescoberta['classe'], guards });
    }
  }
  return rotas;
}

function contexto(rota: RotaDescoberta, papel: Papel): ExecutionContext {
  return {
    getHandler: () => rota.handler,
    getClass: () => rota.classe,
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1', papel, clinicaId: 'c1' } }) }),
  } as unknown as ExecutionContext;
}

/** Resultado do acesso direto de um papel a uma rota: true = entra, false = negado. */
function acessa(rota: RotaDescoberta, papel: Papel): boolean {
  if (rota.guards.includes('SuperAdminGuard')) return papel === Papel.SUPER_ADMIN;
  if (!rota.guards.includes('RolesGuard')) return true; // sem guarda de papel: a matriz tem de marcar PUBLICO/LOGADO
  try {
    return new RolesGuard(new Reflector()).canActivate(contexto(rota, papel));
  } catch {
    return false;
  }
}

const ROTAS = descobrir();

describe('Matriz de autorização — API (papel × endpoint)', () => {
  it('descobre as rotas (sanidade)', () => {
    expect(ROTAS.length).toBeGreaterThan(80);
  });

  it('toda rota está declarada na matriz (negação por padrão)', () => {
    const naoDeclaradas = ROTAS.map((r) => r.chave).filter((c) => !(c in MATRIZ_API));
    expect(naoDeclaradas).toEqual([]);
  });

  it('a matriz não declara rota que não existe mais', () => {
    const existentes = new Set(ROTAS.map((r) => r.chave));
    expect(Object.keys(MATRIZ_API).filter((c) => !existentes.has(c))).toEqual([]);
  });

  describe.each(ROTAS.map((r) => [r.chave, r] as const))('%s', (chave, rota) => {
    const esperado = MATRIZ_API[chave];

    it('nenhuma rota de dado fica sem guarda de papel sem estar marcada como PUBLICO/LOGADO/OIDC', () => {
      if (!esperado) return; // coberto pelo teste de declaração
      const semGuardaDePapel = !rota.guards.includes('RolesGuard') && !rota.guards.includes('SuperAdminGuard');
      if (semGuardaDePapel) expect(['PUBLICO', 'LOGADO', 'OIDC']).toContain(esperado);
    });

    it.each(PAPEIS)('papel %s', (papel) => {
      if (!esperado) return;
      let permitido: boolean;
      if (esperado === 'PUBLICO' || esperado === 'LOGADO' || esperado === 'OIDC') permitido = true;
      else if (esperado === 'SUPER_ADMIN') permitido = papel === Papel.SUPER_ADMIN;
      else permitido = papel === Papel.SUPER_ADMIN || esperado.split('').some((s) => SIGLA_PAPEL[s as PapelSigla] === papel);
      expect(acessa(rota, papel)).toBe(permitido);
    });
  });
});
