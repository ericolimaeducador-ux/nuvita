import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Papel } from '../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { AuditEvent } from '../auth/domain/audit-event.enum';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { ClinicasService } from '../clinicas/application/clinicas.service';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

// feature-clinica-sem-admin: o primeiro administrador é opcional (os dois campos juntos, ou nenhum).

const clinica = {
  nome: 'Clínica da Participante',
  plano: PlanoClinica.BASICO,
  fusoHorario: 'America/Sao_Paulo',
  duracaoConsultaPadrao: 50,
  faseTeste: true,
};

describe('POST /super-admin/clinicas — validação do primeiroAdmin opcional', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = { type: 'body' as const, metatype: CriarClinicaDto };

  it('sem primeiroAdmin: aceito', async () => {
    await expect(pipe.transform({ clinica }, meta)).resolves.toBeDefined();
  });

  it('com nome e e-mail: aceito, como hoje', async () => {
    const body = { clinica, primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' } };
    await expect(pipe.transform(body, meta)).resolves.toBeDefined();
  });

  it.each([
    ['só o nome', { nome: 'Admin' }],
    ['só o e-mail', { email: 'admin@clinica.test' }],
  ])('com %s: 400', async (_rotulo, primeiroAdmin) => {
    await expect(pipe.transform({ clinica, primeiroAdmin }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('com e-mail inválido: continua 400', async () => {
    const body = { clinica, primeiroAdmin: { nome: 'Admin', email: 'nao-e-email' } };
    await expect(pipe.transform(body, meta)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SuperAdminService.criarClinica — sem primeiro admin', () => {
  const ctx = { ip: '127.0.0.1', userAgent: 'jest', userId: 'super-1' };

  function makeService() {
    const onboard = jest.fn().mockImplementation((entrada) =>
      Promise.resolve({
        clinica: { id: 'cli-1', nome: entrada.nome, plano: entrada.plano },
        ...(entrada.primeiroAdmin
          ? {
              admin: { id: 'adm-1', nome: entrada.primeiroAdmin.nome, email: entrada.primeiroAdmin.email, papel: Papel.ADMIN },
              twoFactorSetup: { required: true, otpauthUrl: 'otpauth://x', base32: 'BASE32SECRET' },
            }
          : {}),
        limites: {},
      }),
    );
    const service = new SuperAdminService({} as never, {} as never, {} as never, { onboard } as never);
    return { service, onboard };
  }

  it('sem primeiroAdmin: onboard sem admin, sem senha temporária, sem 2FA na resposta', async () => {
    const { service, onboard } = makeService();

    const res = await service.criarClinica({ clinica } as CriarClinicaDto, ctx);

    expect(onboard.mock.calls[0][0].primeiroAdmin).toBeUndefined();
    expect(res.clinica.id).toBe('cli-1');
    expect(res.admin).toBeUndefined();
    expect(res.senhaTemporaria).toBeUndefined();
    expect(res.twoFactorSetup).toBeUndefined();
  });

  it('com os dois campos: cria o admin como hoje (senha gerada, troca obrigatória, 2FA devolvido)', async () => {
    const { service, onboard } = makeService();

    const res = await service.criarClinica(
      { clinica, primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' } } as CriarClinicaDto,
      ctx,
    );

    const [entrada, , opcoes] = onboard.mock.calls[0];
    expect(entrada.primeiroAdmin).toEqual({ nome: 'Admin', email: 'admin@clinica.test', password: res.senhaTemporaria });
    expect(opcoes).toEqual({ deveTrocarSenha: true, atorUserId: 'super-1' });
    expect(res.admin?.email).toBe('admin@clinica.test');
    expect(res.twoFactorSetup?.base32).toBe('BASE32SECRET');
  });
});

describe('ClinicasService.onboard — sem primeiro admin', () => {
  function makeService() {
    const clinicas = {
      findByDocumento: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cli-1', plano: 'basico', faseTeste: true }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const users = { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn() };
    const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    const configService = { getConfig: jest.fn().mockReturnValue({ bcryptRounds: 12, totpIssuer: 'Nuvita Psi' }) };
    const service = new ClinicasService(clinicas as never, users as never, auditLogs as never, configService as never, {} as never);
    return { service, clinicas, users, auditLogs };
  }

  const entrada = {
    nome: 'Clínica da Participante',
    tipoDocumento: TipoDocumentoFiscal.CNPJ,
    plano: PlanoClinica.BASICO,
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
  };

  it('cria só a clínica: nenhum usuário é criado nem consultado', async () => {
    const { service, clinicas, users } = makeService();

    const res = await service.onboard(entrada as never, { ip: '127.0.0.1', userAgent: 'jest' }, { deveTrocarSenha: true, atorUserId: 'super-1' });

    expect(clinicas.create).toHaveBeenCalledTimes(1);
    expect(users.create).not.toHaveBeenCalled();
    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(res.clinica.id).toBe('cli-1');
    expect((res as { admin?: unknown }).admin).toBeUndefined();
    expect(res.twoFactorSetup).toBeUndefined();
  });

  it('auditoria CLINIC_CREATED com o super-admin como ator e SEM e-mail inventado', async () => {
    const { service, auditLogs } = makeService();

    await service.onboard(entrada as never, { ip: '127.0.0.1', userAgent: 'jest' }, { deveTrocarSenha: true, atorUserId: 'super-1' });

    const registro = auditLogs.create.mock.calls[0][0];
    expect(registro.event).toBe(AuditEvent.CLINIC_CREATED);
    expect(registro.userId).toBe('super-1');
    expect(registro.email).toBeUndefined();
    expect(registro.metadata).not.toHaveProperty('adminId');
  });
});

describe('SuperAdminService.createUsuario — enfermeiro com COREN em clínica sem admin', () => {
  it('cria o ENFERMEIRO na clínica e audita USER_CREATED_BY_SUPER_ADMIN com o COREN', async () => {
    const criado = {
      id: 'psi-1',
      nome: 'Psicóloga',
      email: 'psi@clinica.test',
      papel: Papel.ENFERMEIRO,
      clinicaId: 'cli-1',
      coren: '06/12345',
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(criado),
    };
    const clinicas = { findById: jest.fn().mockResolvedValue({ id: 'cli-1', faseTeste: true }) };
    const registrarAuditoriaAdministrativa = jest.fn().mockResolvedValue(undefined);
    const config = { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita Psi' }) };
    const service = new SuperAdminService(
      users as never,
      clinicas as never,
      config as never,
      { registrarAuditoriaAdministrativa } as unknown as ClinicasService,
    );

    const res = await service.createUsuario(
      { nome: 'Psicóloga', email: 'psi@clinica.test', password: 'senhaTemp123456', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', coren: '06/12345' } as never,
      { ip: '127.0.0.1', userAgent: 'jest', userId: 'super-1' },
    );

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', coren: '06/12345', deveTrocarSenha: true }),
    );
    expect(res.id).toBe('psi-1');
    expect(registrarAuditoriaAdministrativa).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.USER_CREATED_BY_SUPER_ADMIN,
        userId: 'super-1',
        clinicaId: 'cli-1',
        metadata: expect.objectContaining({ createdUserPapel: Papel.ENFERMEIRO, createdUserCoren: '06/12345' }),
      }),
    );
  });
});
