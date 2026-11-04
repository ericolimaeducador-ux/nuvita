import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { SuperAdminService } from '../../super-admin/super-admin.service';
import { CreateAdminUserDto } from '../../super-admin/application/dto/create-admin-user.dto';
import { CreateClinicaUsuarioDto } from './dto/create-clinica-usuario.dto';
import { ClinicasService } from './clinicas.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

// A criação de ENFERMEIRO passa a exigir o COREN (senão cada enfermeiro bate em 422 na primeira assinatura).
// Só "não vazio": formato de número de conselho precisa de fonte oficial (TODO(legal)) e fica pendente.
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const base = { nome: 'Dra. Ana', email: 'ana@clinica.test', password: 'senhaGerada123' };

describe('DTO de criação pelo admin da clínica', () => {
  const dto = (over: Record<string, unknown>) => plainToInstance(CreateClinicaUsuarioDto, { ...base, ...over });

  it('ENFERMEIRO sem COREN: recusado', async () => {
    expect((await validate(dto({ papel: Papel.ENFERMEIRO }), opcoes)).length).toBeGreaterThan(0);
  });
  it.each(['', '   '])('ENFERMEIRO com COREN vazio (%j): recusado', async (coren) => {
    expect((await validate(dto({ papel: Papel.ENFERMEIRO, coren }), opcoes)).length).toBeGreaterThan(0);
  });
  it('ENFERMEIRO com COREN: válido (qualquer texto não vazio; sem validação de formato)', async () => {
    expect(await validate(dto({ papel: Papel.ENFERMEIRO, coren: 'COREN 06/123456' }), opcoes)).toHaveLength(0);
  });
  it('SECRETÁRIA não precisa de COREN', async () => {
    expect(await validate(dto({ papel: Papel.SECRETARIA }), opcoes)).toHaveLength(0);
  });
});

describe('DTO de criação pelo super-admin', () => {
  const dto = (over: Record<string, unknown>) => plainToInstance(CreateAdminUserDto, { ...base, ...over });

  it('ENFERMEIRO sem COREN: recusado', async () => {
    expect((await validate(dto({ papel: Papel.ENFERMEIRO, clinicaId: 'c1' }), opcoes)).length).toBeGreaterThan(0);
  });
  it('ENFERMEIRO com COREN: válido', async () => {
    expect(await validate(dto({ papel: Papel.ENFERMEIRO, clinicaId: 'c1', coren: 'COREN 06/123456' }), opcoes)).toHaveLength(0);
  });
  it('ADMIN não precisa de COREN (só registroProfissional opcional)', async () => {
    expect(await validate(dto({ papel: Papel.ADMIN, clinicaId: 'c1', registroProfissional: '0152482' }), opcoes)).toHaveLength(0);
  });
});

describe('o COREN informado na criação é gravado em user.coren', () => {
  const criado = (over: Record<string, unknown> = {}) => ({
    id: 'novo-1', nome: 'Dra. Ana', email: 'ana@clinica.test', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', ativo: true, ...over,
  });

  it('admin da clínica', async () => {
    const create = jest.fn().mockResolvedValue(criado({ coren: 'COREN 06/123456' }));
    const service = new ClinicasService(
      { findById: jest.fn().mockResolvedValue({ id: 'cli-1', ativo: true }) } as never,
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      {} as never,
    );
    const ctx = { ip: '1', userAgent: 'j', user: { sub: 'adm-1', email: 'a@x', papel: Papel.ADMIN, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const } };
    await service.createUsuario('cli-1', { ...base, papel: Papel.ENFERMEIRO, coren: 'COREN 06/123456' } as never, ctx);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ coren: 'COREN 06/123456' }));
  });

  it('super-admin', async () => {
    const create = jest.fn().mockResolvedValue(criado({ clinicaId: 'cli-9', coren: 'COREN 06/123456' }));
    const service = new SuperAdminService(
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'cli-9', faseTeste: false }) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await service.createUsuario({ ...base, papel: Papel.ENFERMEIRO, clinicaId: 'cli-9', coren: 'COREN 06/123456' } as never, { ip: '1', userAgent: 'j', userId: 'sa-1' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ coren: 'COREN 06/123456' }));
  });

  it('o COREN só entra para ENFERMEIRO (um ADMIN com "coren" no corpo não ganha COREN)', async () => {
    const create = jest.fn().mockResolvedValue(criado({ papel: Papel.ADMIN }));
    const service = new SuperAdminService(
      { findByEmail: jest.fn().mockResolvedValue(null), create } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'cli-9', faseTeste: false }) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) } as never,
    );
    await service.createUsuario({ ...base, papel: Papel.ADMIN, clinicaId: 'cli-9', coren: 'COREN 06/123456' } as never, { ip: '1', userAgent: 'j', userId: 'sa-1' });
    expect(create.mock.calls[0][0].coren).toBeUndefined();
  });
});
