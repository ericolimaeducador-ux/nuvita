import { Papel } from '../../../../../../packages/shared/src/auth';
import { DecisaoUsoIA } from '../domain/registro-uso-ia.enum';
import { DecisaoUsoIaSchema } from '../infrastructure/mongo/decisao-uso-ia.schema';
import { IaClinicaService } from './ia-clinica.service';

// Escopo de tenant também na decisão: clinicaId gravado no próprio documento (aditivo, imutável).
const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'psi@nuvita.test', papel: Papel.PSICOLOGO, clinicaId: 'clinica-1', jti: 'j', typ: 'access' as const },
};

describe('decisoes_uso_ia — clinicaId', () => {
  it('o service grava a decisão com o clinicaId já resolvido do token', async () => {
    const decisoesCreate = jest.fn().mockResolvedValue({ id: 'd1' });
    const service = new IaClinicaService(
      {} as never,
      {} as never,
      { findByIdAndClinica: jest.fn().mockResolvedValue({ id: 'registro-1', usuarioId: 'psi-1', clinicaId: 'clinica-1' }) } as never,
      { create: decisoesCreate, existsForRegistro: jest.fn().mockResolvedValue(false) } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
    );
    await service.registrarDecisao('registro-1', DecisaoUsoIA.ACEITA, context);
    expect(decisoesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ clinicaId: 'clinica-1', registroUsoIaId: 'registro-1', usuarioId: 'psi-1' }),
    );
  });

  it('o schema tem clinicaId imutável (append-only como o resto) e indexado', () => {
    const campo = DecisaoUsoIaSchema.path('clinicaId');
    expect(campo).toBeDefined();
    expect(campo.options.immutable).toBe(true);
    expect(campo.options.index).toBe(true);
  });
});
