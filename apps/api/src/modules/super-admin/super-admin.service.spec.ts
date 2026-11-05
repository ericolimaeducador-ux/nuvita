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

  // Amendment 2026-10-15 (C1, aprovado pelo Erico): o painel passa a desenhar o QR code,
  // então a resposta inclui a otpauthUrl — o mesmo segredo do base32, em outro formato.
  it('retorna clínica, admin, senhaTemporaria (uma vez) e o 2FA (base32 + otpauthUrl p/ QR)', async () => {
    const { service } = makeService();

    const res = await service.criarClinica(dto, ctx);

    expect(res.clinica.id).toBe('cli-1');
    expect(res.admin?.id).toBe('adm-1');
    expect(typeof res.senhaTemporaria).toBe('string');
    expect(res.twoFactorSetup).toEqual({ base32: 'BASE32SECRET', otpauthUrl: 'otpauth://x' });
  });
});

// Amendment (2026-09-11) em feature-forced-password-change.md: ENFERMEIRO
// criado pelo endpoint genérico do super-admin também nasce com
// deveTrocarSenha=true — mesmo CreateUserInput, segundo ponto de chamada.
describe('SuperAdminService.createUsuario — deveTrocarSenha para ENFERMEIRO (amendment 2026-09-11)', () => {
  function makeCreateUsuarioService(overrides: { users?: Record<string, jest.Mock> } = {}) {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        nome: 'Novo Usuário',
        email: 'novo@teste.com',
        papel: Papel.ENFERMEIRO,
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

  it('papel ENFERMEIRO → users.create() recebe deveTrocarSenha: true', async () => {
    const { service, users } = makeCreateUsuarioService();

    await service.createUsuario({ ...dtoBase, papel: Papel.ENFERMEIRO } as CreateAdminUserDto);

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ deveTrocarSenha: true }));
  });

  it('outros papéis (ex.: ADMIN) → users.create() recebe deveTrocarSenha: true (troca obrigatória para todos os papéis)', async () => {
    const { service, users } = makeCreateUsuarioService();

    await service.createUsuario({ ...dtoBase, papel: Papel.ADMIN } as CreateAdminUserDto);

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ deveTrocarSenha: true }));
  });
});

describe('SuperAdminService — fase de teste da clínica (C3, 2026-10-15)', () => {
  function montar(clinica: { id: string; faseTeste: boolean } | null) {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', papel: Papel.ENFERMEIRO, clinicaId: null }),
      create: jest.fn().mockImplementation((input) => Promise.resolve({ id: 'u2', ativo: true, ...input })),
      update: jest.fn().mockImplementation((id, input) => Promise.resolve({ id, email: 'a@b.com', papel: Papel.ENFERMEIRO, ativo: true, ...input })),
      definirFaseTesteDaClinica: jest.fn().mockResolvedValue(3),
    };
    const clinicas = {
      findById: jest.fn().mockResolvedValue(clinica),
      update: jest.fn().mockResolvedValue({ id: 'cli-1', faseTeste: clinica?.faseTeste ?? false }),
    };
    const configService = { getConfig: jest.fn().mockReturnValue({ bcryptRounds: 4, totpIssuer: 'Nuvita Psi' }) };
    const service = new SuperAdminService(users as never, clinicas as never, configService as never, {} as never);
    return { service, users, clinicas };
  }

  it('desmarcar a fase de teste propaga a todos os usuários da clínica', async () => {
    const { service, users } = montar({ id: 'cli-1', faseTeste: true });
    await service.updateClinica('cli-1', { faseTeste: false });
    expect(users.definirFaseTesteDaClinica).toHaveBeenCalledWith('cli-1', false);
  });

  it('editar só o nome não mexe nos usuários', async () => {
    const { service, users } = montar({ id: 'cli-1', faseTeste: true });
    await service.updateClinica('cli-1', { nome: 'Outro nome' });
    expect(users.definirFaseTesteDaClinica).not.toHaveBeenCalled();
  });

  it('usuário criado numa clínica em teste herda faseTeste=true', async () => {
    const { service, users } = montar({ id: 'cli-1', faseTeste: true });
    await service.createUsuario({ nome: 'Ana', email: 'ana@x.com', password: 'SenhaForte123', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1' } as never);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ faseTeste: true }));
  });

  it('usuário sem clínica nasce fora do teste', async () => {
    const { service, users } = montar(null);
    await service.createUsuario({ nome: 'Ana', email: 'ana@x.com', password: 'SenhaForte123', papel: Papel.SECRETARIA } as never);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ faseTeste: false }));
  });

  it('mudar o usuário de clínica passa a seguir a fase da clínica nova', async () => {
    const { service, users } = montar({ id: 'cli-2', faseTeste: true });
    await service.updateUsuario('u1', { clinicaId: 'cli-2' } as never);
    expect(users.update).toHaveBeenCalledWith('u1', expect.objectContaining({ faseTeste: true }));
  });
});
