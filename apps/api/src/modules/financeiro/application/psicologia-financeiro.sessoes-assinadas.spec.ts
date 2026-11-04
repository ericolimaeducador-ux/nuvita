import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusLancamento } from '../domain/lancamento.entity';
import { PsicologiaFinanceiroService } from './psicologia-financeiro.service';

// BUG-025: só prontuário ASSINADO conta como sessão; o servidor devolve as duas situações de cobrança separadas.
const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'psi@nuvita.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
};

const resumo = (pacienteId: string, total: number) => ({
  pacienteId, total, primeiraEm: total ? new Date('2026-10-01T12:00:00Z') : undefined, ultimaEm: total ? new Date('2026-10-20T12:00:00Z') : undefined,
});
const cobranca = (pacienteId: string, ciclo: number, status = StatusLancamento.RECEBIDO) => ({
  id: `c-${pacienteId}-${ciclo}`, pacienteId, ciclo, status, valor: 400, criadoEm: new Date('2026-10-01T12:00:00Z'),
});

function montar(resumos: ReturnType<typeof resumo>[], cobrancas: ReturnType<typeof cobranca>[] = []) {
  // Só o NOVO nome do método existe no fake: o serviço antigo (que contava rascunho) não passa.
  const prontuarios = { resumoSessoesAssinadasPorPaciente: jest.fn().mockResolvedValue(resumos) };
  const service = new PsicologiaFinanceiroService(
    { list: jest.fn().mockResolvedValue(cobrancas) } as never,
    { find: jest.fn().mockResolvedValue(undefined) } as never,
    prontuarios as never,
    { create: jest.fn().mockResolvedValue(undefined) } as never,
    { resumoPorIds: jest.fn().mockResolvedValue(new Map()) } as never,
  );
  return { service, prontuarios };
}

describe('PsicologiaFinanceiroService.painel — só prontuário assinado conta como sessão', () => {
  it('lê o resumo de sessões ASSINADAS (nunca o de todos os registros)', async () => {
    const { service, prontuarios } = montar([resumo('p1', 2)]);
    await service.painel(undefined, context);
    expect(prontuarios.resumoSessoesAssinadasPorPaciente).toHaveBeenCalledWith('cli-1', 'psicoterapia', 'psi-1');
  });

  it('paciente só com rascunho (0 assinadas) APARECE no painel com 0 sessões', async () => {
    const { service } = montar([resumo('p-rascunho', 0)]);
    const painel = await service.painel(undefined, context);
    expect(painel.pacientes).toHaveLength(1);
    expect(painel.pacientes[0]).toMatchObject({ pacienteId: 'p-rascunho', sessoesRealizadas: 0, sessoesNoCiclo: 0, cicloAtual: 1 });
  });

  it('0 assinadas e sem cobrança (rascunho aberto): "sem cobrança no ciclo atual", não "ciclo fechado"', async () => {
    const { service } = montar([resumo('p-rascunho', 0)]);
    const painel = await service.painel(undefined, context);
    expect(painel.ciclosSemCobranca).toBe(1);
    expect(painel.ciclosFechadosARenovar).toBe(0);
  });

  it('1 sessão assinada e nenhuma cobrança (o caso do Bruno): "sem cobrança", NÃO "fechou o ciclo"', async () => {
    const { service } = montar([resumo('p1', 1)]);
    const painel = await service.painel(undefined, context);
    expect(painel.ciclosSemCobranca).toBe(1);
    expect(painel.ciclosFechadosARenovar).toBe(0);
  });

  it('4 assinadas, ciclo 1 pago e nenhuma cobrança do ciclo 2: "ciclo fechado, renovar"', async () => {
    const { service } = montar([resumo('p1', 4)], [cobranca('p1', 1)]);
    const painel = await service.painel(undefined, context);
    expect(painel.pacientes[0]).toMatchObject({ cicloAtual: 2, sessoesNoCiclo: 0 });
    expect(painel.ciclosFechadosARenovar).toBe(1);
    expect(painel.ciclosSemCobranca).toBe(0);
  });

  it('4 assinadas e ciclo 2 já cobrado: nenhum alerta', async () => {
    const { service } = montar([resumo('p1', 4)], [cobranca('p1', 1), cobranca('p1', 2, StatusLancamento.PENDENTE)]);
    const painel = await service.painel(undefined, context);
    expect(painel.ciclosFechadosARenovar).toBe(0);
    expect(painel.ciclosSemCobranca).toBe(0);
  });

  it('ciclosACobrar continua existindo e é a soma das duas situações', async () => {
    const { service } = montar([resumo('p1', 4), resumo('p2', 1), resumo('p3', 2)], [cobranca('p1', 1), cobranca('p3', 1)]);
    const painel = await service.painel(undefined, context);
    expect(painel.ciclosFechadosARenovar).toBe(1); // p1
    expect(painel.ciclosSemCobranca).toBe(1); // p2
    expect(painel.ciclosACobrar).toBe(painel.ciclosFechadosARenovar + painel.ciclosSemCobranca);
  });
});
