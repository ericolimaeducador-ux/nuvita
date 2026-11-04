import { BadRequestException, ConflictException, ExecutionContext, ForbiddenException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Papel } from '../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { AuditEvent } from '../auth/domain/audit-event.enum';
import { SuperAdminGuard } from '../auth/presentation/guards/super-admin.guard';
import { ClinicasService } from '../clinicas/application/clinicas.service';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { ClinicaMongoRepository } from '../clinicas/infrastructure/mongo/clinica-mongo.repository';
import { UpdateClinicaDto } from './application/dto/update-clinica.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

/**
 * SUPER_ADMIN corrige documento + tipoDocumento de uma clínica (identidade fiscal digitada errada).
 * Imutável para a clínica; mutável só pelo super-admin, com validação do par e auditoria.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = { type: 'body' as const, metatype: UpdateClinicaDto };
const validar = (corpo: unknown) => pipe.transform(corpo, body);

const ator = { ip: '203.0.113.9', userAgent: 'jest', userId: 'super-1' };

describe('UpdateClinicaDto — documento fiscal (a)(b)', () => {
  it('aceita o par CNPJ válido (com ou sem pontuação)', async () => {
    await expect(validar({ tipoDocumento: 'CNPJ', documento: '11.222.333/0001-81' })).resolves.toMatchObject({
      tipoDocumento: 'CNPJ',
      documento: '11.222.333/0001-81',
    });
    await expect(validar({ tipoDocumento: 'CNPJ', documento: '11222333000181' })).resolves.toBeDefined();
  });

  it('aceita o par CPF válido', async () => {
    await expect(validar({ tipoDocumento: 'CPF', documento: '529.982.247-25' })).resolves.toBeDefined();
  });

  it('rejeita CNPJ com 11 dígitos (o caso da clínica "Teste")', async () => {
    await expect(validar({ tipoDocumento: 'CNPJ', documento: '03294572689' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita CPF com 14 dígitos', async () => {
    await expect(validar({ tipoDocumento: 'CPF', documento: '11222333000181' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita número inválido (dígito verificador errado)', async () => {
    await expect(validar({ tipoDocumento: 'CNPJ', documento: '11222333000182' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(validar({ tipoDocumento: 'CPF', documento: '52998224724' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige OS DOIS: só documento ou só tipoDocumento é rejeitado', async () => {
    await expect(validar({ documento: '11222333000181' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(validar({ tipoDocumento: 'CNPJ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita tipoDocumento fora do enum e campo antigo "cnpj" (whitelist mantida)', async () => {
    await expect(validar({ tipoDocumento: 'RG', documento: '11222333000181' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(validar({ cnpj: '11222333000181' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('(b) corpo sem os campos fiscais segue valendo como hoje', async () => {
    await expect(
      validar({ nome: 'Nova', plano: PlanoClinica.BASICO, ativo: true, faseTeste: false, telefone: '(11) 4000-1234', emailContato: 'c@clinica.test' }),
    ).resolves.toMatchObject({ nome: 'Nova', ativo: true });
  });
});

const clinicaAtual = (extra: Record<string, unknown> = {}) => ({
  id: 'cli-1',
  nome: 'Teste',
  documento: '03294572689',
  tipoDocumento: TipoDocumentoFiscal.CNPJ,
  plano: PlanoClinica.BASICO,
  configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
  ativo: true,
  faseTeste: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  ...extra,
});

function makeService(opcoes: { atual?: ReturnType<typeof clinicaAtual> | null; outraComMesmoDocumento?: { id: string } | null } = {}) {
  const atual = opcoes.atual === undefined ? clinicaAtual() : opcoes.atual;
  const clinicas = {
    findById: jest.fn().mockResolvedValue(atual),
    findByDocumento: jest.fn().mockResolvedValue(opcoes.outraComMesmoDocumento ?? null),
    update: jest.fn(async (_id: string, input: Record<string, unknown>) => (atual ? { ...atual, ...input } : null)),
  };
  const clinicasService = { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) };
  const service = new SuperAdminService({} as never, clinicas as never, {} as never, clinicasService as never);
  return { service, clinicas, clinicasService };
}

describe('SuperAdminService.updateClinica — identidade fiscal (d)(e)', () => {
  it('(e) par coerente é repassado ao repositório', async () => {
    const { service, clinicas } = makeService();

    await service.updateClinica('cli-1', { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '032.945.726-89' } as never, ator);

    expect(clinicas.update).toHaveBeenCalledWith(
      'cli-1',
      expect.objectContaining({ tipoDocumento: TipoDocumentoFiscal.CPF, documento: '032.945.726-89' }),
    );
  });

  it('(d) grava CLINIC_FISCAL_DOCUMENT_UPDATED com clinicaId e antes/depois, sem outros dados', async () => {
    const { service, clinicasService } = makeService();

    await service.updateClinica('cli-1', { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '03294572689' } as never, ator);

    expect(clinicasService.registrarAuditoriaAdministrativa).toHaveBeenCalledTimes(1);
    const entrada = clinicasService.registrarAuditoriaAdministrativa.mock.calls[0][0];
    expect(entrada).toMatchObject({
      event: (AuditEvent as unknown as Record<string, string>).CLINIC_FISCAL_DOCUMENT_UPDATED,
      userId: 'super-1',
      ip: '203.0.113.9',
      userAgent: 'jest',
    });
    expect(entrada.event).toBe('CLINIC_FISCAL_DOCUMENT_UPDATED');
    expect(entrada.metadata).toEqual({
      clinicaId: 'cli-1',
      antes: { tipoDocumento: 'CNPJ', documento: '03294572689' },
      depois: { tipoDocumento: 'CPF', documento: '03294572689' },
    });
  });

  it('documento e tipo normalizados na auditoria (sem pontuação)', async () => {
    const { service, clinicasService } = makeService({ atual: clinicaAtual({ tipoDocumento: TipoDocumentoFiscal.CPF }) });

    await service.updateClinica('cli-1', { tipoDocumento: TipoDocumentoFiscal.CNPJ, documento: '11.222.333/0001-81' } as never, ator);

    expect(clinicasService.registrarAuditoriaAdministrativa.mock.calls[0][0].metadata.depois).toEqual({
      tipoDocumento: 'CNPJ',
      documento: '11222333000181',
    });
  });

  it('documento já usado por OUTRA clínica → 409, nada é gravado nem auditado', async () => {
    const { service, clinicas, clinicasService } = makeService({ outraComMesmoDocumento: { id: 'cli-2' } });

    await expect(
      service.updateClinica('cli-1', { tipoDocumento: TipoDocumentoFiscal.CNPJ, documento: '11222333000181' } as never, ator),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(clinicas.update).not.toHaveBeenCalled();
    expect(clinicasService.registrarAuditoriaAdministrativa).not.toHaveBeenCalled();
  });

  it('mesmo documento da PRÓPRIA clínica (só trocar o tipo) não é conflito', async () => {
    const { service, clinicas } = makeService({ outraComMesmoDocumento: { id: 'cli-1' } });

    await service.updateClinica('cli-1', { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '03294572689' } as never, ator);

    expect(clinicas.update).toHaveBeenCalled();
  });

  it('clínica inexistente → 404 e nenhuma auditoria', async () => {
    const { service, clinicasService } = makeService({ atual: null });

    await expect(
      service.updateClinica('x', { tipoDocumento: TipoDocumentoFiscal.CNPJ, documento: '11222333000181' } as never, ator),
    ).rejects.toThrow();
    expect(clinicasService.registrarAuditoriaAdministrativa).not.toHaveBeenCalled();
  });

  it('(b) edição sem campos fiscais não consulta documento nem grava auditoria fiscal', async () => {
    const { service, clinicas, clinicasService } = makeService();

    await service.updateClinica('cli-1', { nome: 'Outro nome', ativo: true } as never, ator);

    expect(clinicas.findByDocumento).not.toHaveBeenCalled();
    expect(clinicasService.registrarAuditoriaAdministrativa).not.toHaveBeenCalled();
    expect(clinicas.update).toHaveBeenCalledWith('cli-1', expect.objectContaining({ nome: 'Outro nome' }));
  });
});

describe('ClinicaMongoRepository.update — grava o documento onde o /clinicas/minha lê (e)', () => {
  it('grava cnpj normalizado e tipoDocumento; o resultado reflete no documento da entidade', async () => {
    const doc = {
      toObject: () => ({
        _id: { toString: () => 'cli-1' },
        nome: 'Teste',
        cnpj: '03294572689',
        tipoDocumento: TipoDocumentoFiscal.CPF,
        plano: PlanoClinica.BASICO,
        configuracoes: {},
        ativo: true,
        criadoEm: new Date(),
      }),
    };
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: async () => doc });
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);

    const r = await repo.update('cli-1', { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '032.945.726-89' } as never);

    const [, operacao] = findByIdAndUpdate.mock.calls[0];
    expect(operacao.$set).toMatchObject({ cnpj: '03294572689', tipoDocumento: 'CPF' });
    expect(operacao.$set).not.toHaveProperty('documento');
    expect(r).toMatchObject({ documento: '03294572689', tipoDocumento: 'CPF' });
  });

  it('sem campos fiscais, não toca em cnpj nem tipoDocumento', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: async () => null });
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);

    await repo.update('cli-1', { nome: 'Só o nome' });

    const [, operacao] = findByIdAndUpdate.mock.calls[0];
    expect(operacao.$set).toEqual({ nome: 'Só o nome' });
  });
});

describe('(c) só SUPER_ADMIN alcança esse caminho', () => {
  const ctx = (papel: Papel) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user: { papel } }) }) }) as unknown as ExecutionContext;

  it('SuperAdminGuard barra ADMIN, PSICOLOGO e SECRETARIA e libera SUPER_ADMIN', () => {
    const guard = new SuperAdminGuard();
    for (const papel of [Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA]) {
      expect(() => guard.canActivate(ctx(papel))).toThrow(ForbiddenException);
    }
    expect(guard.canActivate(ctx(Papel.SUPER_ADMIN))).toBe(true);
  });

  it('o controller do super-admin aplica o SuperAdminGuard na classe inteira', () => {
    const { SuperAdminController } = jest.requireActual('./super-admin.controller');
    const guards: unknown[] = Reflect.getMetadata('__guards__', SuperAdminController) ?? [];
    expect(guards).toContain(SuperAdminGuard);
  });

  // Invariante reescrita (feature-clinic-fiscal-document-first-use; antes: "só o SUPER_ADMIN grava o documento").
  // Agora: (i) o documento da clínica só é gravável pelo SUPER_ADMIN (qualquer valor) ou por PATCH /clinicas/minha/documento;
  // (ii) esse endpoint só grava quando o valor atual é o sentinela SEM-DOCUMENTO-; (iii) só na PRÓPRIA clínica do token.
  it('(i) ClinicasController (rota do ADMIN) continua sem endpoint que grave documento/tipoDocumento', () => {
    const fonte = readFileSync(join(__dirname, '../clinicas/presentation/clinicas.controller.ts'), 'utf8');
    expect(fonte).not.toMatch(/@(Patch|Put)[^]*?(documento|tipoDocumento)/);
  });

  it('(i) a única outra rota que grava o documento é PATCH /clinicas/minha/documento, só para PSICOLOGO', () => {
    const { ClinicaDocumentoController } = jest.requireActual('../clinicas/presentation/clinica-documento.controller');
    expect(Reflect.getMetadata('path', ClinicaDocumentoController)).toBe('clinicas/minha');
    const rota = ClinicaDocumentoController.prototype.preencherDocumento;
    expect(Reflect.getMetadata('path', rota)).toBe('documento');
    expect(Reflect.getMetadata('method', rota)).toBe(RequestMethod.PATCH);
    expect(Reflect.getMetadata('roles', rota)).toEqual([Papel.PSICOLOGO]);
    const fonte = readFileSync(join(__dirname, '../clinicas/presentation/clinica-documento.controller.ts'), 'utf8');
    expect((fonte.match(/@(Patch|Put|Post|Delete)\(/g) ?? []).length).toBe(1);
  });

  it('(ii) o endpoint só grava quando o documento atual é o sentinela (o filtro do update exige o prefixo)', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec: async () => null });
    const repo = new ClinicaMongoRepository({ findOneAndUpdate } as never);
    await repo.preencherDocumentoSeVazio('6addf7a498eae6c5fd7e9dda', '529.982.247-25', TipoDocumentoFiscal.CPF);
    expect(findOneAndUpdate.mock.calls[0][0].cnpj).toEqual({ $regex: '^SEM-DOCUMENTO-' });
  });

  it('(iii) só grava na PRÓPRIA clínica do token: a rota não recebe id de clínica e o service usa o clinicaId do token', async () => {
    const { ClinicaDocumentoController } = jest.requireActual('../clinicas/presentation/clinica-documento.controller');
    const fonte = readFileSync(join(__dirname, '../clinicas/presentation/clinica-documento.controller.ts'), 'utf8');
    expect(fonte).not.toMatch(/@(Param|Query)\(/);
    expect(ClinicaDocumentoController).toBeDefined();
    const preencher = jest.fn().mockResolvedValue({ id: 'cli-do-token', documento: '52998224725', tipoDocumento: 'CPF' });
    const clinicas = {
      findByDocumento: jest.fn().mockResolvedValue(null), findById: jest.fn().mockResolvedValue({ id: 'cli-do-token', nome: 'C', documento: '52998224725', configuracoes: {} }),
      preencherDocumentoSeVazio: preencher,
    };
    const service = new ClinicasService(clinicas as never, {} as never, { create: jest.fn() } as never, { getConfig: jest.fn().mockReturnValue({}) } as never, { getSignedReadUrl: jest.fn() } as never);
    const usuario = { sub: 'psi-1', email: 'p@x.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-do-token', jti: 'j', typ: 'access' as const };
    await service.preencherDocumento({ tipoDocumento: TipoDocumentoFiscal.CPF, documento: '529.982.247-25' }, { ip: '1', userAgent: 'j', user: usuario });
    expect(preencher.mock.calls[0][0]).toBe('cli-do-token');
  });
});
