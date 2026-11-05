import { RegistroUsoIaSchema } from './registro-uso-ia.schema';

/**
 * Testes sem banco: verificam a DEFINIÇÃO do schema (imutabilidade, defaults,
 * índices, pre-hooks registrados). Não provam que o Mongoose aplica as regras
 * em runtime — a suíte não tem camada de banco. Ver §10 do TDD.
 */

const CAMPOS_IMUTAVEIS = [
  'clinicaId',
  'usuarioId',
  'tipo',
  'modelo',
  'inputCifrado',
  'inputIv',
  'inputAuthTag',
  'outputCifrado',
  'outputIv',
  'outputAuthTag',
  'criadoEm',
];

const OPS_BLOQUEADAS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
];

describe('registros_uso_ia schema', () => {
  it('marca todos os campos como imutáveis', () => {
    for (const campo of CAMPOS_IMUTAVEIS) {
      expect(RegistroUsoIaSchema.path(campo).options.immutable).toBe(true);
    }
  });

  it('criadoEm tem valor default', () => {
    expect(RegistroUsoIaSchema.path('criadoEm').options.default).toBeDefined();
  });

  it('declara o índice composto clinicaId + usuarioId + criadoEm desc', () => {
    const indices = (RegistroUsoIaSchema.indexes() as Array<[Record<string, unknown>, unknown]>).map(
      ([campos]) => campos,
    );
    expect(indices).toContainEqual({ clinicaId: 1, usuarioId: 1, criadoEm: -1 });
  });

  it('registra pre-hook para cada operação de mutação (append-only)', () => {
    // _pres é API interna do Mongoose; é o único jeito de afirmar "há hook
    // registrado" sem abrir conexão.
    const pres = (RegistroUsoIaSchema as unknown as {
      s: { hooks: { _pres: Map<string, unknown[]> } };
    }).s.hooks._pres;

    for (const op of OPS_BLOQUEADAS) {
      expect(pres.get(op)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
