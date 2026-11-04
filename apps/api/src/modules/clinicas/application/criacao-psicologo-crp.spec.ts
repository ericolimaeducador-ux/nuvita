import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { SuperAdminService } from '../../super-admin/super-admin.service';
import { CreateAdminUserDto } from '../../super-admin/application/dto/create-admin-user.dto';
import { CreateClinicaUsuarioDto } from './dto/create-clinica-usuario.dto';
import { ClinicasService } from './clinicas.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

// A criação de PSICÓLOGO passa a exigir o CRP (senão cada psicólogo bate em 422 na primeira assinatura).
// Só "não vazio": formato de número de conselho precisa de fonte oficial do CFP e fica pendente.
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const base = { nome: 'Dra. Ana', email: 'ana@clinica.test', password: 'senhaGerada123' };

describe('DTO de criação pelo admin da clínica', () => {
  const dto = (over: Record<string, unknown>) => plainToInstance(CreateClinicaUsuarioDto, { ...base, ...over });

  it('PSICÓLOGO sem CRP: recusado', async () => {
    expect((await validate(dto({ papel: Papel.PSICOLOGO }), opcoes)).length).toBeGreaterThan(0);
  });
  it.each(['', '   '])('PSICÓLOGO com CRP vazio (%j): recusado', async (crp) => {
    expect((await validate(dto({ papel: Papel.PSICOLOGO, crp }), opcoes)).length).toBeGreaterThan(0);
  });
  it('PSICÓLOGO com CRP: válido (qualquer texto não vazio; sem validação de formato)', async () => {
    expect(await validate(dto({ papel: Papel.PSICOLOGO, crp: 'CRP 06/123456' }), opcoes)).toHaveLength(0);
  });
  it('SECRETÁRIA não precisa de CRP', async () => {
    expect(await validate(dto({ papel: Papel.SECRETARIA }), opcoes)).toHaveLength(0);
  });
});

describe('DTO de criação pelo super-admin', () => {
  const dto = (over: Record<string, unknown>) => plainToInstance(CreateAdminUserDto, { ...base, ...over });

  it('PSICÓLOGO sem CRP: recusado', async () => {
    expect((await validate(dto({ papel: Papel.PSICOLOGO, clinicaId: 'c1' }), opcoes)).length).toBeGreaterThan(0);
  });
  it('PSICÓLOGO com CRP: válido', async () => {
    expect(await validate(dto({ papel: Papel.PSICOLOGO, clinicaId: 'c1', crp: 'CRP 06/123456' }), opcoes)).toHaveLength(0);
  });
  it('ADMIN não precisa de CRP (só registroProfissional opcional)', async () => {
    expect(await validate(dto({ papel: Papel.ADMIN, clinicaId: 'c1', registroProfissional: '0152482' }), opcoes)).toHaveLength(0);
  });
});

describe('o CRP informado na criação é gravado em user.crp', () => {
  const criado = (over: Record<string, unknown> = {}) => ({
    id: 'novo-1', nome: 'Dra. Ana', email: 'ana@clinica.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', ativo: true, ...over,
  });

  it('admin da clínica', async () => {
    const create = jest.fn().mockResolvedValue(criado({ crp: 'CRP 06/123456' }));
    const service = new ClinicasService(
      { findById: jest.fn().mockResolvedValue({ id: 'cli-1', ativo: true }) } as never,
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      {} as never,
    );
    const ctx = { ip: '1', userAgent: 'j', user: { sub: 'adm-1', email: 'a@x', papel: Papel.ADMIN, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const } };
    await service.createUsuario('cli-1', { ...base, papel: Papel.PSICOLOGO, crp: 'CRP 06/123456' } as never, ctx);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ crp: 'CRP 06/123456' }));
  });

  it('super-admin', async () => {
    const create = jest.fn().mockResolvedValue(criado({ clinicaId: 'cli-9', crp: 'CRP 06/123456' }));
    const service = new SuperAdminService(
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'cli-9', faseTeste: false }) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await service.createUsuario({ ...base, papel: Papel.PSICOLOGO, clinicaId: 'cli-9', crp: 'CRP 06/123456' } as never, { ip: '1', userAgent: 'j', userId: 'sa-1' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ crp: 'CRP 06/123456' }));
  });

  it('o CRP só entra para PSICÓLOGO (um ADMIN com "crp" no corpo não ganha CRP)', async () => {
    const create = jest.fn().mockResolvedValue(criado({ papel: Papel.ADMIN }));
    const service = new SuperAdminService(
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'cli-9', faseTeste: false }) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await service.createUsuario({ ...base, papel: Papel.ADMIN, clinicaId: 'cli-9', crp: 'CRP 06/123456' } as never, { ip: '1', userAgent: 'j', userId: 'sa-1' });
    expect(create.mock.calls[0][0].crp).toBeUndefined();
  });
});
