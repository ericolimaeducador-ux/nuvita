import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Papel } from '../../../../../packages/shared/src/auth';
import { AuditEvent } from '../auth/domain/audit-event.enum';
import { User } from '../auth/domain/user.entity';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { UpdateUserDto } from './application/dto/update-user.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

/**
 * Auditoria do timbre (feature-timbre-clinico-dinamico, PR 1):
 *  - SUPER_ADMIN corrige o COREN de um usuário (sempre permitido) → AuditLog USER_COREN_CORRECTED anterior/novo;
 *  - SUPER_ADMIN muda telefone/emailContato da clínica → AuditLog CLINIC_CONTACT_UPDATED antes/depois.
 * O SuperAdminService não tem repositório de auditoria próprio: a escrita passa pelo ClinicasService
 * (que já grava AuditLog), via registrarAuditoriaAdministrativa(input) — contrato novo assumido.
 */
// bracket notation: o enum ainda não tem os valores na fase Red (senão seria erro de compilação do arquivo todo)
const evento = (nome: string): string | undefined => (AuditEvent as unknown as Record<string, string>)[nome];

const ator = { ip: '203.0.113.9', userAgent: 'jest', userId: 'super-1' };

const usuario = (extra: Partial<User> = {}): User => ({
  id: 'u1',
  nome: 'Fulano',
  email: 'fulano@clinica.test',
  passwordHash: 'x',
  papel: Papel.ENFERMEIRO,
  clinicaId: 'cli-1',
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  deveTrocarSenha: false,
  ...extra,
});

const clinica = (configuracoes: Record<string, unknown> = {}) => ({
  id: 'cli-1',
  nome: 'Clínica',
  documento: '11222333000181',
  tipoDocumento: TipoDocumentoFiscal.CNPJ,
  plano: PlanoClinica.BASICO,
  configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50, ...configuracoes },
  ativo: true,
  faseTeste: false,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
});

function makeService(atual: User | null = usuario(), clinicaAtual: ReturnType<typeof clinica> | null = clinica()) {
  const users = {
    findById: jest.fn().mockResolvedValue(atual),
    update: jest.fn(async (_id: string, input: Record<string, unknown>) => ({ ...atual, ...input })),
  };
  const clinicas = {
    findById: jest.fn().mockResolvedValue(clinicaAtual),
    update: jest.fn(async (_id: string, input: Record<string, unknown>) => ({
      ...clinicaAtual,
      configuracoes: { ...clinicaAtual?.configuracoes, ...input },
    })),
  };
  const clinicasService = { registrarAuditoriaAdministrativa: jest.fn().mockResolvedValue(undefined) };
  const service = new SuperAdminService(users as never, clinicas as never, {} as never, clinicasService as never);
  return { service, users, clinicas, clinicasService };
}

const updateUsuario = (s: SuperAdminService, id: string, dto: unknown, ctx: unknown) =>
  (s as unknown as { updateUsuario(i: string, d: unknown, c: unknown): Promise<unknown> }).updateUsuario(id, dto, ctx);
const updateClinica = (s: SuperAdminService, id: string, dto: unknown, ctx: unknown) =>
  (s as unknown as { updateClinica(i: string, d: unknown, c: unknown): Promise<unknown> }).updateClinica(id, dto, ctx);

describe('SUPER_ADMIN corrige o COREN de um usuário (auditado)', () => {
  it('UpdateUserDto aceita coren com trim e rejeita vazio/só espaços e tamanho excessivo', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const meta = { type: 'body' as const, metatype: UpdateUserDto };

    await expect(pipe.transform({ coren: '  06/777  ' }, meta)).resolves.toMatchObject({ coren: '06/777' });
    await expect(pipe.transform({ coren: '   ' }, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ coren: 'x'.repeat(41) }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('corrige o COREN já preenchido e grava USER_COREN_CORRECTED com valor anterior e novo', async () => {
    const { service, users, clinicasService } = makeService(usuario({ coren: '06/111' } as Partial<User>));

    await updateUsuario(service, 'u1', { coren: '06/777' }, ator);

    expect(users.update).toHaveBeenCalledWith('u1', expect.objectContaining({ coren: '06/777' }));
    expect(clinicasService.registrarAuditoriaAdministrativa).toHaveBeenCalledTimes(1);
    expect(clinicasService.registrarAuditoriaAdministrativa).toHaveBeenCalledWith(
      expect.objectContaining({
        event: evento('USER_COREN_CORRECTED'),
        userId: 'super-1',
        ip: '203.0.113.9',
        userAgent: 'jest',
        metadata: expect.objectContaining({ alvoUserId: 'u1', corenAnterior: '06/111', corenNovo: '06/777' }),
      }),
    );
  });

  it('também audita quando o COREN estava vazio (anterior ausente)', async () => {
    const { service, clinicasService } = makeService(usuario());

    await updateUsuario(service, 'u1', { coren: '06/777' }, ator);

    const [input] = clinicasService.registrarAuditoriaAdministrativa.mock.calls[0];
    expect(input.event).toBe(evento('USER_COREN_CORRECTED'));
    expect(input.metadata.corenNovo).toBe('06/777');
    expect(input.metadata.corenAnterior).toBeUndefined();
  });

  it('sem coren no corpo (ou o mesmo valor), não audita COREN', async () => {
    const { service, clinicasService } = makeService(usuario({ coren: '06/111' } as Partial<User>));

    await updateUsuario(service, 'u1', { nome: 'Outro Nome' }, ator);
    await updateUsuario(service, 'u1', { coren: '06/111' }, ator);

    expect(clinicasService.registrarAuditoriaAdministrativa).not.toHaveBeenCalled();
  });
});

describe('SUPER_ADMIN muda telefone/emailContato da clínica (auditado)', () => {
  it('grava CLINIC_CONTACT_UPDATED com os campos alterados e antes/depois', async () => {
    const { service, clinicasService } = makeService(
      usuario(),
      clinica({ telefone: '(11) 4000-0000', emailContato: 'velho@clinica.test' }),
    );

    await updateClinica(service, 'cli-1', { telefone: '(11) 4000-1234', emailContato: 'novo@clinica.test' }, ator);

    expect(clinicasService.registrarAuditoriaAdministrativa).toHaveBeenCalledTimes(1);
    expect(clinicasService.registrarAuditoriaAdministrativa).toHaveBeenCalledWith(
      expect.objectContaining({
        event: evento('CLINIC_CONTACT_UPDATED'),
        userId: 'super-1',
        ip: '203.0.113.9',
        userAgent: 'jest',
        metadata: expect.objectContaining({
          clinicaId: 'cli-1',
          campos: ['telefone', 'emailContato'],
          antes: { telefone: '(11) 4000-0000', emailContato: 'velho@clinica.test' },
          depois: { telefone: '(11) 4000-1234', emailContato: 'novo@clinica.test' },
        }),
      }),
    );
  });

  it('só os campos de contato enviados entram na auditoria', async () => {
    const { service, clinicasService } = makeService(usuario(), clinica({ telefone: '(11) 4000-0000' }));

    await updateClinica(service, 'cli-1', { telefone: '(11) 4000-1234' }, ator);

    const [input] = clinicasService.registrarAuditoriaAdministrativa.mock.calls[0];
    expect(input.metadata.campos).toEqual(['telefone']);
    expect(input.metadata.antes).toEqual({ telefone: '(11) 4000-0000' });
    expect(input.metadata.depois).toEqual({ telefone: '(11) 4000-1234' });
  });

  it('mudança sem contato (ex.: nome/plano) não gera auditoria de contato', async () => {
    const { service, clinicasService } = makeService();

    await updateClinica(service, 'cli-1', { nome: 'Novo Nome' }, ator);

    expect(clinicasService.registrarAuditoriaAdministrativa).not.toHaveBeenCalled();
  });
});
