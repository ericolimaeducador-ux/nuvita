import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

/**
 * Consistência de `faseTeste` (achados Média do review do #24):
 *  D1 — updateClinica grava a clínica e depois propaga a fase de teste aos usuários (dois passos). Se o
 *       2º falhar, clínica e usuários não podem ficar divergentes: a edição inteira é desfeita.
 *  D2 — criar clínica exige a escolha explícita de faseTeste (sem padrão silencioso).
 */
describe('SuperAdminService.updateClinica — faseTeste atômico (D1)', () => {
  const inicial = { id: 'cli-1', nome: 'Clínica A', plano: PlanoClinica.BASICO, ativo: true, faseTeste: true };

  type Estado = { clinica: typeof inicial; usuariosFaseTeste: boolean };
  function montar(criarPropagar: ((estado: Estado) => jest.Mock) | null = null) {
    const estado = { clinica: { ...inicial }, usuariosFaseTeste: true };
    const clinicas = {
      findById: jest.fn(async () => ({ ...estado.clinica })),
      update: jest.fn(async (_id: string, input: Record<string, unknown>) => {
        estado.clinica = { ...estado.clinica, ...input };
        return { ...estado.clinica };
      }),
    };
    const users = {
      definirFaseTesteDaClinica:
        criarPropagar?.(estado) ??
        jest.fn(async (_id: string, valor: boolean) => {
          estado.usuariosFaseTeste = valor;
          return 3;
        }),
    };
    const service = new SuperAdminService(users as never, clinicas as never, {} as never, {} as never);
    return { service, estado, clinicas, users };
  }

  afterEach(() => jest.restoreAllMocks());

  it('2ª etapa falha: rejeita com o mesmo erro e a clínica volta ao estado anterior (nada persiste)', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    let chamadas = 0;
    let falhaNaIda!: jest.Mock;
    const { service, estado } = montar((e) => {
      falhaNaIda = jest.fn(async (_id: string, valor: boolean) => {
        chamadas += 1;
        e.usuariosFaseTeste = valor;
        if (chamadas === 1) throw new Error('mongo caiu no meio do updateMany'); // falha PARCIAL: parte dos usuários já mudou
        return 3; // a compensação funciona
      });
      return falhaNaIda;
    });

    await expect(service.updateClinica('cli-1', { faseTeste: false, nome: 'Clínica B' })).rejects.toThrow(
      'mongo caiu no meio do updateMany',
    );

    expect(estado.clinica).toEqual(inicial); // nome e faseTeste de volta
    expect(falhaNaIda).toHaveBeenNthCalledWith(2, 'cli-1', true); // usuários re-propagados ao valor anterior
  });

  it('se a compensação também falha, o erro original continua sendo o que sobe (e o problema é logado)', async () => {
    const erroLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service } = montar(() => jest.fn().mockRejectedValue(new Error('falha original')));

    await expect(service.updateClinica('cli-1', { faseTeste: false })).rejects.toThrow('falha original');

    expect(erroLog).toHaveBeenCalled();
  });

  it('caminho feliz: grava a clínica uma vez, propaga uma vez e não compensa nada', async () => {
    const { service, estado, clinicas, users } = montar();

    await service.updateClinica('cli-1', { faseTeste: false, nome: 'Clínica B' });

    expect(estado.clinica).toMatchObject({ nome: 'Clínica B', faseTeste: false });
    expect(estado.usuariosFaseTeste).toBe(false);
    expect(clinicas.update).toHaveBeenCalledTimes(1);
    expect(users.definirFaseTesteDaClinica).toHaveBeenCalledTimes(1);
  });

  it('sem faseTeste no corpo: só grava a clínica (não propaga nem compensa)', async () => {
    const { service, clinicas, users } = montar();

    await service.updateClinica('cli-1', { nome: 'Outro nome' });

    expect(clinicas.update).toHaveBeenCalledTimes(1);
    expect(users.definirFaseTesteDaClinica).not.toHaveBeenCalled();
  });
});

describe('CriarClinicaDto — faseTeste explícito (D2)', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = { type: 'body' as const, metatype: CriarClinicaDto };
  const payload = (faseTeste?: unknown) => ({
    clinica: {
      nome: 'Clínica Nova',
      tipoDocumento: TipoDocumentoFiscal.CNPJ,
      documento: '11222333000181',
      plano: PlanoClinica.BASICO,
      fusoHorario: 'America/Sao_Paulo',
      duracaoConsultaPadrao: 50,
      ...(faseTeste === undefined ? {} : { faseTeste }),
    },
    primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' },
  });

  it('sem faseTeste: rejeitado (400) — a escolha é obrigatória, sem padrão silencioso', async () => {
    await expect(pipe.transform(payload(), meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([true, false])('faseTeste=%s explícito é aceito', async (valor) => {
    await expect(pipe.transform(payload(valor), meta)).resolves.toBeDefined();
  });

  it('valor que não é booleano (ex.: "sim") é rejeitado', async () => {
    await expect(pipe.transform(payload('sim'), meta)).rejects.toBeInstanceOf(BadRequestException);
  });
});
