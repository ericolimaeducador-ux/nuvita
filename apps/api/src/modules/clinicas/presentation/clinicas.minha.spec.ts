import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { ROLES_KEY } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ClinicasService } from '../application/clinicas.service';
import { TipoDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../domain/clinica.entity';
import { ClinicasController } from './clinicas.controller';

/**
 * GET /clinicas/minha (feature-timbre-clinico-dinamico, PR 1 backend).
 * Contratos novos assumidos (não existem hoje):
 *   ClinicasService.obterMinha(user): Promise<{ nome, documento, tipoDocumento, endereco, telefone, emailContato, logoUrl }>
 *   ClinicasController.minha(user)  — @Get('minha'), JwtAuthGuard + RolesGuard(ADMIN, PSICOLOGO, SECRETARIA)
 */
const clinica = (id: string, nome: string) => ({
  id,
  nome,
  documento: '11222333000181',
  tipoDocumento: TipoDocumentoFiscal.CNPJ,
  endereco: { logradouro: 'Rua A', numero: '10', cidade: 'São Paulo', estado: 'SP', cep: '01000-000' },
  plano: PlanoClinica.BASICO,
  configuracoes: {
    fusoHorario: 'America/Sao_Paulo',
    duracaoConsultaPadrao: 50,
    telefone: '(11) 4000-1234',
    emailContato: 'contato@clinica.test',
    logoUrl: 'https://cdn.test/logo.png',
  },
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
});

const userDe = (clinicaId: string | undefined, papel: Papel = Papel.PSICOLOGO) => ({
  sub: 'u1',
  email: 'u@clinica.test',
  papel,
  clinicaId,
  jti: 'j',
  typ: 'access' as const,
});

function makeService() {
  const bancoDeClinicas: Record<string, ReturnType<typeof clinica>> = {
    'cli-A': clinica('cli-A', 'Clínica A'),
    'cli-B': clinica('cli-B', 'Clínica B'),
  };
  const clinicas = { findById: jest.fn(async (id: string) => bancoDeClinicas[id] ?? null) };
  const service = new ClinicasService(clinicas as never, {} as never, {} as never, {} as never);
  return { service, clinicas };
}

const obterMinha = (service: ClinicasService, user: unknown) =>
  (service as unknown as { obterMinha(u: unknown): Promise<Record<string, unknown>> }).obterMinha(user);

describe('GET /clinicas/minha', () => {
  // RED 1
  it('retorna a clínica do tenant do usuário logado, com os campos do timbre', async () => {
    const { service } = makeService();

    const r = await obterMinha(service, userDe('cli-A'));

    expect(r).toEqual({
      nome: 'Clínica A',
      documento: '11222333000181',
      tipoDocumento: TipoDocumentoFiscal.CNPJ,
      endereco: { logradouro: 'Rua A', numero: '10', cidade: 'São Paulo', estado: 'SP', cep: '01000-000' },
      telefone: '(11) 4000-1234',
      emailContato: 'contato@clinica.test',
      logoUrl: 'https://cdn.test/logo.png',
    });
  });

  it('clínica sem telefone/e-mail/logo: os campos vêm ausentes (nunca string vazia)', async () => {
    const { service, clinicas } = makeService();
    const sem = clinica('cli-A', 'Clínica A');
    sem.configuracoes = { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 } as never;
    clinicas.findById.mockResolvedValueOnce(sem);

    const r = await obterMinha(service, userDe('cli-A'));

    expect(r.nome).toBe('Clínica A');
    expect(r.telefone).toBeUndefined();
    expect(r.emailContato).toBeUndefined();
    expect(r.logoUrl).toBeUndefined();
  });

  // RED 2
  it('é tenant-scoped: usuário da clínica A lê só a A e nunca consulta a B', async () => {
    const { service, clinicas } = makeService();

    const r = await obterMinha(service, userDe('cli-A'));

    expect(r.nome).toBe('Clínica A');
    expect(clinicas.findById).toHaveBeenCalledTimes(1);
    expect(clinicas.findById).toHaveBeenCalledWith('cli-A');
    expect(clinicas.findById).not.toHaveBeenCalledWith('cli-B');
  });

  it('usuário sem clinicaId no token é negado (403)', async () => {
    const { service, clinicas } = makeService();

    await expect(obterMinha(service, userDe(undefined))).rejects.toBeInstanceOf(ForbiddenException);
    expect(clinicas.findById).not.toHaveBeenCalled();
  });

  it('a rota não aceita clinicaId do cliente (sem @Param/@Query): o tenant vem só do token', () => {
    const handler = (ClinicasController.prototype as unknown as { minha?: (...a: unknown[]) => unknown }).minha;
    expect(handler).toBeDefined();
    expect(handler!.length).toBe(1); // só o usuário autenticado
  });

  // RED 3
  describe('acesso por papel e autenticação', () => {
    const handler = () => (ClinicasController.prototype as unknown as Record<string, () => unknown>).minha;

    it('é GET /clinicas/minha', () => {
      expect(Reflect.getMetadata(METHOD_METADATA, handler())).toBe(0); // RequestMethod.GET
      expect(Reflect.getMetadata(PATH_METADATA, handler())).toBe('minha');
    });

    it('exige autenticação (JwtAuthGuard), tenant e RolesGuard', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler()) as unknown[];
      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, TenantRequiredGuard, RolesGuard]));
    });

    it('papéis liberados: ADMIN, PSICOLOGO e SECRETARIA (e só eles)', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, handler()) as Papel[];
      expect([...roles].sort()).toEqual([Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA].sort());
    });

    const roles = new RolesGuard(new Reflector());
    const ctx = (papel: Papel) =>
      ({
        getHandler: () => handler(),
        getClass: () => ClinicasController,
        switchToHttp: () => ({ getRequest: () => ({ user: userDe('cli-A', papel) }) }),
      }) as never;

    it.each([Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA])('RolesGuard real libera %s', (papel) => {
      expect(roles.canActivate(ctx(papel))).toBe(true);
    });

    it('RolesGuard real nega PACIENTE', () => {
      expect(() => roles.canActivate(ctx(Papel.PACIENTE))).toThrow(ForbiddenException);
    });
  });
});
