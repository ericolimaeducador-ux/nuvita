import { Papel } from '../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { CreateAdminUserDto } from './application/dto/create-admin-user.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

const dto: CriarClinicaDto = {
  clinica: {
    nome: 'Clínica Nova',
    tipoDocumento: TipoDocumentoFiscal.CNPJ,
    documento: '11222333000181',
    plano: PlanoClinica.BASICO,
    fusoHorario: 'America/Sao_Paulo',
    duracaoConsultaPadrao: 50,
  },
  primeiroAdmin: { nome: 'Admin da Clínica', email: 'admin@clinicanova.test' },
};

const ctx = { ip: '127.0.0.1', userAgent: 'jest', userId: 'super-1' };

function makeService() {
  const onboard = jest.fn().mockImplementation((onboardDto) =>
    Promise.resolve({
      clinica: { id: 'cli-1', nome: onboardDto.nome, plano: onboardDto.plano },
      admin: { id: 'adm-1', nome: onboardDto.primeiroAdmin.nome, email: onboardDto.primeiroAdmin.email, papel: Papel.ADMIN, clinicaId: 'cli-1' },
      limites: {},
      twoFactorSetup: { required: true, otpauthUrl: 'otpauth://x', base32: 'BASE32SECRET' },
    }),
  );
  const clinicasService = { onboard } as never;

  const service = new SuperAdminService(
    {} as never, // users
    {} as never, // clinicas repo
    {} as never, // configService
    clinicasService,
  );
  return { service, onboard };
}

describe('SuperAdminService.criarClinica (Fase 7)', () => {
  it('gera senha temporária, chama onboard com deveTrocarSenha=true e ator = super admin', async () => {
    const { service, onboard } = makeService();

    const res = await service.criarClinica(dto, ctx);

    const [onboardDto, onboardCtx, onboardOptions] = onboard.mock.calls[0];
    expect(onboardDto.primeiroAdmin.password).toEqual(res.senhaTemporaria);
    expect(onboardDto.primeiroAdmin.password.length).toBeGreaterThanOrEqual(16);
    expect(onboardCtx).toEqual(expect.objectContaining({ ip: '127.0.0.1' }));
    expect(onboardOptions).toEqual({ deveTrocarSenha: true, atorUserId: 'super-1' });
  });

  it('mapeia fusoHorario/duracao para configuracoes do CreateClinicaDto', async () => {
    const { service, onboard } = makeService();

    await service.criarClinica(dto, ctx);

    const [onboardDto] = onboard.mock.calls[0];
    expect(onboardDto.configuracoes).toEqual({
      fusoHorario: 'America/Sao_Paulo',
      duracaoConsultaPadrao: 50,
    });
  });

  it('retorna clínica, admin, senhaTemporaria (uma vez) e só o base32 do 2FA', async () => {
    const { service } = makeService();

    const res = await service.criarClinica(dto, ctx);

    expect(res.clinica.id).toBe('cli-1');
    expect(res.admin.id).toBe('adm-1');
    expect(typeof res.senhaTemporaria).toBe('string');
    expect(res.twoFactorSetup).toEqual({ base32: 'BASE32SECRET' });
  });
});

// Amendment (2026-09-11) em feature-forced-password-change.md: PSICOLOGO
// criado pelo endpoint genérico do super-admin também nasce com
// deveTrocarSenha=true — mesmo CreateUserInput, segundo ponto de chamada.
describe('SuperAdminService.createUsuario — deveTrocarSenha para PSICOLOGO (amendment 2026-09-11)', () => {
  function makeCreateUsuarioService(overrides: { users?: Record<string, jest.Mock> } = {}) {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        nome: 'Novo Usuário',
        email: 'novo@teste.com',
        papel: Papel.PSICOLOGO,
        ativo: true,
      }),
      ...overrides.users,
    };
    const configService = { getConfig: jest.fn().mockReturnValue({ bcryptRounds: 12 }) };

    const service = new SuperAdminService(
      users as never,
      {} as never, // clinicas repo — não usado por createUsuario()
      configService as never,
      {} as never, // clinicasService — não usado por createUsuario()
    );
    return { service, users };
  }

  const dtoBase: Omit<CreateAdminUserDto, 'papel'> = {
    nome: 'Novo Usuário',
    email: 'novo@teste.com',
    password: 'senhaGerada123',
  };

  it('papel PSICOLOGO → users.create() recebe deveTrocarSenha: true', async () => {
    const { service, users } = makeCreateUsuarioService();

    await service.createUsuario({ ...dtoBase, papel: Papel.PSICOLOGO } as CreateAdminUserDto);

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ deveTrocarSenha: true }));
  });

  it('outros papéis (ex.: ADMIN) → users.create() NÃO recebe deveTrocarSenha: true (fora do escopo)', async () => {
    const { service, users } = makeCreateUsuarioService();

    await service.createUsuario({ ...dtoBase, papel: Papel.ADMIN } as CreateAdminUserDto);

    expect(users.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ deveTrocarSenha: true }),
    );
  });
});
