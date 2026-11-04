import { BadRequestException, ConflictException, ForbiddenException, Logger, UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal, mascararDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PlanoClinica } from '../domain/clinica.entity';
import { ClinicasService } from './clinicas.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

// feature-clinic-fiscal-document-first-use: a clínica nasce sem documento; a psicóloga informa UMA vez (gravação atômica).
const CPF = '529.982.247-25';
const ctx = (clinicaId: string | undefined = 'cli-1') => ({
  ip: '1.1.1.1', userAgent: 'jest',
  user: { sub: 'psi-1', email: 'psi@x.test', papel: Papel.PSICOLOGO, clinicaId, jti: 'j', typ: 'access' as const },
});
const ctxSemClinica = () => ({ ...ctx(), user: { ...ctx().user, clinicaId: undefined } });

function criar(over: { clinicas?: Record<string, jest.Mock> } = {}) {
  const clinicas = {
    findByDocumento: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue({ id: 'cli-1', nome: 'Clínica', documento: '', configuracoes: {} }),
    create: jest.fn().mockResolvedValue({ id: 'cli-1', plano: 'basico' }),
    preencherDocumentoSeVazio: jest.fn().mockResolvedValue({ id: 'cli-1', documento: '52998224725', tipoDocumento: TipoDocumentoFiscal.CPF }),
    ...over.clinicas,
  };
  const users = {
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'adm-1', nome: 'Admin', email: 'a@x.test', papel: Papel.ADMIN, clinicaId: 'cli-1' }),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const config = { getConfig: jest.fn().mockReturnValue({ bcryptRounds: 12, totpIssuer: 'Nuvita Psi' }) };
  const service = new ClinicasService(clinicas as never, users as never, auditLogs as never, config as never, {} as never);
  return { service, clinicas, users, auditLogs };
}

describe('onboard sem documento fiscal', () => {
  const semDocumento = {
    nome: 'Clínica da Claudia', plano: PlanoClinica.BASICO,
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
    primeiroAdmin: { nome: 'Claudia', email: 'claudia@x.test', password: 'senhaGerada123' },
  };
  it('cria a clínica e não consulta duplicidade de documento', async () => {
    const { service, clinicas } = criar();
    await expect(service.onboard(semDocumento as never, { ip: '1', userAgent: 'j' })).resolves.toBeDefined();
    expect(clinicas.findByDocumento).not.toHaveBeenCalled();
    expect(clinicas.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Clínica da Claudia', documento: undefined }));
  });
});

describe('ClinicasService.preencherDocumento', () => {
  const dto = { tipoDocumento: TipoDocumentoFiscal.CPF, documento: CPF };

  it('grava uma vez, de forma atômica, e audita quem + valor MASCARADO (nunca o documento inteiro)', async () => {
    const { service, clinicas, auditLogs } = criar();
    await service.preencherDocumento(dto as never, ctx());
    expect(clinicas.preencherDocumentoSeVazio).toHaveBeenCalledWith('cli-1', CPF, TipoDocumentoFiscal.CPF);
    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    const log = auditLogs.create.mock.calls[0][0];
    expect(log).toMatchObject({ event: AuditEvent.CLINIC_FISCAL_DOCUMENT_FILLED, userId: 'psi-1', email: 'psi@x.test' });
    expect(log.metadata).toMatchObject({ clinicaId: 'cli-1', tipoDocumento: 'CPF', documentoMascarado: mascararDocumentoFiscal(TipoDocumentoFiscal.CPF, CPF) });
    expect(JSON.stringify(log)).not.toContain('52998224725');
    expect(JSON.stringify(log)).not.toContain(CPF);
  });

  it('já preenchido (a gravação condicional não casou): 409 e nada é auditado', async () => {
    const { service, auditLogs } = criar({ clinicas: { preencherDocumentoSeVazio: jest.fn().mockResolvedValue(null) } });
    await expect(service.preencherDocumento(dto as never, ctx())).rejects.toThrow(ConflictException);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  // Condição (c) do sentinela: o cliente nunca descobre que o número existe em outra clínica; sem E11000; sem o documento no log.
  const GENERICA = 'Não foi possível salvar. Confirme o número ou fale com o suporte.';
  const vazou = (texto: string) => /já cadastrado|outra|E11000|duplicate|52998224725|529.982.247-25/i.test(texto);

  it('documento de OUTRA clínica: 400 com mensagem genérica, nada é gravado, sem revelar que existe', async () => {
    const { service, clinicas } = criar({ clinicas: { findByDocumento: jest.fn().mockResolvedValue({ id: 'outra' }) } });
    const erro = await service.preencherDocumento(dto as never, ctx()).catch((e) => e);
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(erro.message).toBe(GENERICA);
    expect(vazou(JSON.stringify(erro.getResponse()))).toBe(false);
    expect(clinicas.preencherDocumentoSeVazio).not.toHaveBeenCalled();
  });

  it('corrida (o índice único recusa depois da checagem, E11000): a MESMA resposta genérica, sem a mensagem do Mongo', async () => {
    const e11000 = Object.assign(new Error('E11000 duplicate key error collection: clinicas index: cnpj_1 dup key: { cnpj: "52998224725" }'), { code: 11000 });
    const { service } = criar({ clinicas: { preencherDocumentoSeVazio: jest.fn().mockRejectedValue(e11000) } });
    const erro = await service.preencherDocumento(dto as never, ctx()).catch((e) => e);
    expect(erro).toBeInstanceOf(BadRequestException);
    expect(erro.message).toBe(GENERICA);
    expect(vazou(JSON.stringify(erro.getResponse()))).toBe(false);
  });

  it('o log não recebe o documento em claro nem a mensagem do Mongo', async () => {
    const logs: string[] = [];
    const espioes = (['warn', 'error', 'log'] as const).map((n) => jest.spyOn(Logger.prototype, n).mockImplementation((m: unknown) => { logs.push(String(m)); }));
    const e11000 = Object.assign(new Error('E11000 duplicate key { cnpj: "52998224725" }'), { code: 11000 });
    const { service } = criar({ clinicas: { preencherDocumentoSeVazio: jest.fn().mockRejectedValue(e11000) } });
    await service.preencherDocumento(dto as never, ctx()).catch(() => undefined);
    espioes.forEach((e) => e.mockRestore());
    expect(logs.join(' ')).not.toMatch(/52998224725|529.982.247-25|E11000/);
  });

  it('erro que NÃO é de índice único segue como erro (não é engolido)', async () => {
    const { service } = criar({ clinicas: { preencherDocumentoSeVazio: jest.fn().mockRejectedValue(new Error('conexão caiu')) } });
    await expect(service.preencherDocumento(dto as never, ctx())).rejects.toThrow('conexão caiu');
  });

  it('usuário sem clínica no token: 403', async () => {
    const { service } = criar();
    await expect(service.preencherDocumento(dto as never, ctxSemClinica())).rejects.toThrow(ForbiddenException);
  });
});

describe('ClinicasService.assertDocumentoInformado', () => {
  it('sem documento: 422 "Informe o CPF/CNPJ do consultório"', async () => {
    const { service } = criar();
    await expect(service.assertDocumentoInformado('cli-1')).rejects.toThrow(new UnprocessableEntityException('Informe o CPF/CNPJ do consultório'));
  });
  it('com documento: passa', async () => {
    const { service } = criar({ clinicas: { findById: jest.fn().mockResolvedValue({ id: 'cli-1', documento: '52998224725' }) } });
    await expect(service.assertDocumentoInformado('cli-1')).resolves.toBeUndefined();
  });
});

describe('mascararDocumentoFiscal', () => {
  it('CPF e CNPJ mostram só os 2 últimos dígitos', () => {
    expect(mascararDocumentoFiscal(TipoDocumentoFiscal.CPF, '52998224725')).toBe('***.***.***-25');
    expect(mascararDocumentoFiscal(TipoDocumentoFiscal.CNPJ, '11222333000181')).toBe('**.***.***/****-81');
  });
});
