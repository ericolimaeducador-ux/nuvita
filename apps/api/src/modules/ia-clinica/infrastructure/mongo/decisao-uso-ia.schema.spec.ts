import { DecisaoUsoIaSchema } from './decisao-uso-ia.schema';

/**
 * Testes sem banco: verificam a DEFINIÇÃO do schema. Ver §10 do TDD para por
 * que a aplicação em runtime não é testada aqui.
 */

const CAMPOS_IMUTAVEIS = ['registroUsoIaId', 'usuarioId', 'decisao', 'decididoEm'];

const OPS_BLOQUEADAS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
];

describe('decisoes_uso_ia schema', () => {
  it('marca todos os campos como imutáveis', () => {
    for (const campo of CAMPOS_IMUTAVEIS) {
      expect(DecisaoUsoIaSchema.path(campo).options.immutable).toBe(true);
    }
  });

  it('decididoEm tem valor default', () => {
    expect(DecisaoUsoIaSchema.path('decididoEm').options.default).toBeDefined();
  });

  it('registroUsoIaId é obrigatório', () => {
    expect(DecisaoUsoIaSchema.path('registroUsoIaId').isRequired).toBe(true);
  });

  it('declara índice ÚNICO em registroUsoIaId — uma decisão por registro', () => {
    const idx = (
      DecisaoUsoIaSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>
    ).find(([campos]) => JSON.stringify(campos) === JSON.stringify({ registroUsoIaId: 1 }));

    expect(idx).toBeDefined();
    expect(idx?.[1]).toMatchObject({ unique: true });
  });

  it('registra pre-hook para cada operação de mutação (append-only)', () => {
    const pres = (DecisaoUsoIaSchema as unknown as {
      s: { hooks: { _pres: Map<string, unknown[]> } };
    }).s.hooks._pres;

    for (const op of OPS_BLOQUEADAS) {
      expect(pres.get(op)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
