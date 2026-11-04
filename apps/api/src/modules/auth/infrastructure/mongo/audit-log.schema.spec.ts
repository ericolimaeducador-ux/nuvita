import { AuditLogSchema } from './audit-log.schema';

/**
 * Testes sem banco: verificam a DEFINIÇÃO do schema (imutabilidade dos campos,
 * default do timestamp, índice de tenant, pre-hooks append-only registrados).
 * Não provam que o Mongoose aplica as regras em runtime — a suíte não tem
 * camada de banco (mesma lacuna do item 4 de `infra/PENDENCIAS.md`).
 *
 * Mesmo formato de `registro-uso-ia.schema.spec.ts` /
 * `decisao-uso-ia.schema.spec.ts`. `audit_logs` é a coleção de trilha de
 * auditoria mais crítica do sistema e era a única com pre-hooks de
 * imutabilidade sem cobertura de teste nenhuma.
 */

const CAMPOS_IMUTAVEIS = [
  'event',
  'userId',
  'clinicaId',
  'email',
  'ip',
  'userAgent',
  'timestamp',
  'metadata',
];

const OPS_BLOQUEADAS = [
  'updateOne',
  'findOneAndUpdate',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
];

describe('audit_logs schema', () => {
  it('marca todos os campos como imutáveis', () => {
    for (const campo of CAMPOS_IMUTAVEIS) {
      expect(AuditLogSchema.path(campo).options.immutable).toBe(true);
    }
  });

  it('timestamp tem valor default', () => {
    expect(AuditLogSchema.path('timestamp').options.default).toBeDefined();
  });

  it('event, ip, userAgent e timestamp são obrigatórios', () => {
    for (const campo of ['event', 'ip', 'userAgent', 'timestamp']) {
      expect(AuditLogSchema.path(campo).isRequired).toBe(true);
    }
  });

  it('declara o índice composto clinicaId + _id (leitura por tenant)', () => {
    const indices = (
      AuditLogSchema.indexes() as Array<[Record<string, unknown>, unknown]>
    ).map(([campos]) => campos);

    expect(indices).toContainEqual({ clinicaId: 1, _id: 1 });
  });

  it('registra pre-hook para cada operação de mutação (append-only)', () => {
    // _pres é API interna do Mongoose; é o único jeito de afirmar "há hook
    // registrado" sem abrir conexão.
    const pres = (
      AuditLogSchema as unknown as {
        s: { hooks: { _pres: Map<string, unknown[]> } };
      }
    ).s.hooks._pres;

    for (const op of OPS_BLOQUEADAS) {
      expect(pres.get(op)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
