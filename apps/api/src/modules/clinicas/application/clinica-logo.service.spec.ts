import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PlanoClinica } from '../domain/clinica.entity';
import { ClinicasService } from './clinicas.service';
import { ClinicaLogoService } from './clinica-logo.service';

/**
 * Logo da clínica (feature-logo-clinica, PR backend). Contratos novos assumidos (não existem hoje):
 *   ClinicaLogoService(clinicas, auditLogs, storage)
 *     .solicitarUpload(actor, clinicaId, { mimeType, tamanho, hash }, ctx) -> { uploadUrl, logoKey, expiresInSeconds }
 *     .confirmar(actor, clinicaId, { logoKey }, ctx)   // HeadObject antes de gravar; grava a CHAVE, não a URL
 *     .remover(actor, clinicaId, ctx)
 *   ClinicaRepository.update(id, { logoKey: string | null })  // null limpa configuracoes.logoKey
 *   DocumentStorage: headObject devolve também { mimeType }; privateUrlForKey(key) monta a URL privada do objeto
 *   ClinicasService(clinicas, users, auditLogs, config, storage).obterMinha gera logoUrl = GET presignado da chave
 *   AuditEvent.CLINIC_LOGO_UPDATED / CLINIC_LOGO_REMOVED
 */
const MB = 1024 * 1024;
const LIMITE = 2 * MB;
const CTX = { ip: '203.0.113.9', userAgent: 'jest' };
const HASH = 'a'.repeat(64);

const clinicaBase = (id: string) => ({
  id,
  nome: `Clínica ${id}`,
  documento: '11222333000181',
  tipoDocumento: TipoDocumentoFiscal.CNPJ,
  plano: PlanoClinica.BASICO,
  configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 } as Record<string, unknown>,
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
});

const admin = (clinicaId: string) => ({ sub: 'adm-' + clinicaId, email: `adm@${clinicaId}.test`, papel: Papel.ADMIN, clinicaId, jti: 'j', typ: 'access' as const });
const superAdmin = { sub: 'sa-1', email: 'sa@plataforma.test', papel: Papel.SUPER_ADMIN, clinicaId: undefined, jti: 'j', typ: 'access' as const };
const psicologo = (clinicaId: string) => ({ ...admin(clinicaId), sub: 'psi-1', papel: Papel.PSICOLOGO });

function setup() {
  const banco: Record<string, ReturnType<typeof clinicaBase>> = {
    'cli-A': clinicaBase('cli-A'),
    'cli-B': clinicaBase('cli-B'),
  };
  const clinicas = {
    findById: jest.fn(async (id: string) => banco[id] ?? null),
    update: jest.fn(async (id: string, input: { logoKey?: string | null }) => {
      const c = banco[id];
      if (!c) return null;
      if (input.logoKey === null) delete c.configuracoes.logoKey;
      else if (input.logoKey !== undefined) c.configuracoes.logoKey = input.logoKey;
      return c;
    }),
  };
  const auditLogs = { create: jest.fn(async () => undefined) };
  const storage = {
    createUploadUrl: jest.fn(async (i: { key: string }) => ({
      uploadUrl: `https://r2.test/put/${i.key}?X-Amz-Signature=x`,
      privateUrl: `s3://bucket/${i.key}`,
      expiresInSeconds: 900,
    })),
    headObject: jest.fn(async (): Promise<{ tamanho: number; mimeType?: string } | undefined> => ({
      tamanho: 1000,
      mimeType: 'image/png',
    })),
    privateUrlForKey: jest.fn((key: string) => `s3://bucket/${key}`),
    createReadUrl: jest.fn(async (privateUrl: string, ttl: number) => `https://r2.test/get/${privateUrl.slice(12)}?ttl=${ttl}`),
    deleteObject: jest.fn(async () => undefined),
  };
  const logo = new ClinicaLogoService(clinicas as never, auditLogs as never, storage as never);
  const minha = new ClinicasService(clinicas as never, {} as never, auditLogs as never, {} as never, storage as never);
  return { banco, clinicas, auditLogs, storage, logo, minha };
}

const pedido = (extra: Partial<{ mimeType: string; tamanho: number; hash: string }> = {}) => ({
  mimeType: 'image/png',
  tamanho: 50_000,
  hash: HASH,
  ...extra,
});

describe('logo da clínica — presign de upload', () => {
  // a)
  it('PNG: URL presignada de PUT em logos/<clinicaId>/..., com content-type image/png', async () => {
    const { logo, storage } = setup();

    const r = await logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido(), CTX);

    expect(r.logoKey).toMatch(/^logos\/cli-A\/[A-Za-z0-9-]+\.png$/);
    expect(r.uploadUrl).toContain(r.logoKey);
    expect(storage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ key: r.logoKey, mimeType: 'image/png', tamanho: 50_000, hash: HASH }),
    );
  });

  it('JPG: chave .jpg e content-type image/jpeg', async () => {
    const { logo, storage } = setup();

    const r = await logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido({ mimeType: 'image/jpeg' }), CTX);

    expect(r.logoKey).toMatch(/^logos\/cli-A\/[A-Za-z0-9-]+\.jpg$/);
    expect(storage.createUploadUrl).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'image/jpeg' }));
  });

  it.each(['image/svg+xml', 'image/gif', 'image/webp', 'application/pdf', 'text/html', 'IMAGE/PNG; charset=x', ''])(
    'content-type "%s" é recusado (só PNG/JPG; sem SVG) e nada é presignado',
    async (mimeType) => {
      const { logo, storage } = setup();

      await expect(logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido({ mimeType }), CTX)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(storage.createUploadUrl).not.toHaveBeenCalled();
    },
  );

  it('limite de 2 MB: exatamente 2 MB passa; 2 MB + 1 byte, zero e negativo são recusados', async () => {
    const { logo, storage } = setup();

    await expect(logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido({ tamanho: LIMITE }), CTX)).resolves.toBeDefined();
    storage.createUploadUrl.mockClear();

    for (const tamanho of [LIMITE + 1, 0, -5, Number.NaN]) {
      await expect(logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido({ tamanho }), CTX)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    }
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it('a chave não carrega nome de arquivo nem dado do cliente e muda a cada pedido', async () => {
    const { logo } = setup();

    const a = await logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido(), CTX);
    const b = await logo.solicitarUpload(admin('cli-A'), 'cli-A', pedido(), CTX);

    expect(a.logoKey).not.toBe(b.logoKey);
  });

  it('SUPER_ADMIN pode para qualquer clínica (por id)', async () => {
    const { logo } = setup();

    const r = await logo.solicitarUpload(superAdmin, 'cli-B', pedido(), CTX);

    expect(r.logoKey).toMatch(/^logos\/cli-B\//);
  });

  it('clínica inexistente: 404 (SUPER_ADMIN)', async () => {
    const { logo, storage } = setup();

    await expect(logo.solicitarUpload(superAdmin, 'nao-existe', pedido(), CTX)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it.each([Papel.PSICOLOGO, Papel.SECRETARIA, Papel.PACIENTE])('papel %s é negado (403)', async (papel) => {
    const { logo, storage } = setup();

    await expect(
      logo.solicitarUpload({ ...psicologo('cli-A'), papel }, 'cli-A', pedido(), CTX),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });
});

describe('logo da clínica — confirmar upload (HeadObject antes de gravar)', () => {
  const KEY = 'logos/cli-A/3f2b9c1e-0000-4000-8000-000000000001.png';

  // b)
  it('sucesso: confere o objeto no storage e grava a CHAVE (não a URL) em configuracoes.logoKey', async () => {
    const { logo, clinicas, storage } = setup();

    await logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: KEY }, CTX);

    expect(storage.headObject).toHaveBeenCalledWith(`s3://bucket/${KEY}`);
    expect(clinicas.update).toHaveBeenCalledTimes(1);
    expect(clinicas.update).toHaveBeenCalledWith('cli-A', { logoKey: KEY });
    const gravado = JSON.stringify(clinicas.update.mock.calls[0]);
    expect(gravado).not.toContain('s3://');
    expect(gravado).not.toContain('https://');
  });

  it('JPG também é aceito', async () => {
    const { logo, clinicas, storage } = setup();
    storage.headObject.mockResolvedValueOnce({ tamanho: 900_000, mimeType: 'image/jpeg' });

    await logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: 'logos/cli-A/x1.jpg' }, CTX);

    expect(clinicas.update).toHaveBeenCalledWith('cli-A', { logoKey: 'logos/cli-A/x1.jpg' });
  });

  it('objeto acima de 2 MB: 422, nada é gravado e o objeto inválido é removido do bucket', async () => {
    const { logo, clinicas, storage, auditLogs } = setup();
    storage.headObject.mockResolvedValueOnce({ tamanho: LIMITE + 1, mimeType: 'image/png' });

    await expect(logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: KEY }, CTX)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(clinicas.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
    expect(storage.deleteObject).toHaveBeenCalledWith(`s3://bucket/${KEY}`);
  });

  it.each(['image/svg+xml', 'image/gif', 'text/html', 'application/octet-stream', undefined])(
    'content-type real do objeto "%s": 422 e nada é gravado',
    async (mimeType) => {
      const { logo, clinicas, storage } = setup();
      storage.headObject.mockResolvedValueOnce({ tamanho: 1000, mimeType });

      await expect(logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: KEY }, CTX)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(clinicas.update).not.toHaveBeenCalled();
      expect(storage.deleteObject).toHaveBeenCalled();
    },
  );

  it('objeto inexistente no bucket: 422 e nada é gravado', async () => {
    const { logo, clinicas, storage } = setup();
    storage.headObject.mockResolvedValueOnce(undefined);

    await expect(logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: KEY }, CTX)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(clinicas.update).not.toHaveBeenCalled();
  });

  it.each([
    'logos/cli-B/x.png', // prefixo de outra clínica
    'logos/cli-A/../cli-B/x.png', // traversal
    'documentos/cli-A/x.png', // fora do prefixo de logos
    'logos/cli-A/x.svg', // extensão fora de png/jpg
    's3://bucket/logos/cli-A/x.png', // URL no lugar de chave
    '',
  ])('chave "%s" não pertence à clínica / é inválida: recusada sem consultar o bucket', async (logoKey) => {
    const { logo, clinicas, storage } = setup();

    await expect(logo.confirmar(admin('cli-A'), 'cli-A', { logoKey }, CTX)).rejects.toThrow();
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(clinicas.update).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN confirma para qualquer clínica, mas só com chave do prefixo DAQUELA clínica', async () => {
    const { logo, clinicas } = setup();

    await logo.confirmar(superAdmin, 'cli-B', { logoKey: 'logos/cli-B/x.png' }, CTX);
    expect(clinicas.update).toHaveBeenCalledWith('cli-B', { logoKey: 'logos/cli-B/x.png' });

    await expect(logo.confirmar(superAdmin, 'cli-B', { logoKey: KEY }, CTX)).rejects.toThrow();
  });
});

describe('GET /clinicas/minha — logoUrl presignada', () => {
  // c)
  it('com logoKey: logoUrl é um GET presignado de curta duração gerado da chave; a chave crua não sai', async () => {
    const { minha, banco, storage } = setup();
    banco['cli-A'].configuracoes.logoKey = 'logos/cli-A/x.png';

    const r = (await minha.obterMinha(admin('cli-A'))) as unknown as Record<string, unknown>;

    expect(storage.createReadUrl).toHaveBeenCalledTimes(1);
    const [privateUrl, ttl] = storage.createReadUrl.mock.calls[0] as unknown as [string, number];
    expect(privateUrl).toBe('s3://bucket/logos/cli-A/x.png');
    expect(ttl).toBeGreaterThanOrEqual(60);
    expect(ttl).toBeLessThanOrEqual(3600);
    expect(r.logoUrl).toBe(`https://r2.test/get/bucket/logos/cli-A/x.png?ttl=${ttl}`);
    expect(r).not.toHaveProperty('logoKey');
  });

  it('contrato compatível: continuam os mesmos campos de antes (logoUrl segue string)', async () => {
    const { minha, banco } = setup();
    banco['cli-A'].configuracoes.logoKey = 'logos/cli-A/x.png';

    const r = await minha.obterMinha(admin('cli-A'));

    expect(Object.keys(r).sort()).toEqual(
      ['documento', 'emailContato', 'endereco', 'logoUrl', 'nome', 'telefone', 'tipoDocumento'].sort(),
    );
    expect(typeof r.logoUrl).toBe('string');
  });

  it('sem logoKey: logoUrl undefined e nenhuma URL é presignada', async () => {
    const { minha, storage } = setup();

    const r = await minha.obterMinha(admin('cli-A'));

    expect(r.logoUrl).toBeUndefined();
    expect(storage.createReadUrl).not.toHaveBeenCalled();
  });

  it('clínica antiga com logoUrl legado e sem logoKey: logoUrl segue undefined (nada público)', async () => {
    const { minha, banco } = setup();
    banco['cli-A'].configuracoes.logoUrl = 'https://qualquer.test/logo.png';

    const r = await minha.obterMinha(admin('cli-A'));

    expect(r.logoUrl).toBeUndefined();
  });

  it('falha ao presignar não derruba o timbre: logoUrl undefined (cabeçalho textual)', async () => {
    const { minha, banco, storage } = setup();
    banco['cli-A'].configuracoes.logoKey = 'logos/cli-A/x.png';
    storage.createReadUrl.mockRejectedValueOnce(new Error('storage indisponível'));

    const r = await minha.obterMinha(admin('cli-A'));

    expect(r.nome).toBe('Clínica cli-A');
    expect(r.logoUrl).toBeUndefined();
  });
});

describe('logo da clínica — remover', () => {
  // d)
  it('ADMIN da própria clínica limpa a logoKey; depois /clinicas/minha devolve logoUrl undefined', async () => {
    const { logo, minha, banco, clinicas } = setup();
    banco['cli-A'].configuracoes.logoKey = 'logos/cli-A/x.png';
    expect((await minha.obterMinha(admin('cli-A'))).logoUrl).toBeDefined();

    await logo.remover(admin('cli-A'), 'cli-A', CTX);

    expect(clinicas.update).toHaveBeenCalledWith('cli-A', { logoKey: null });
    expect((await minha.obterMinha(admin('cli-A'))).logoUrl).toBeUndefined();
  });

  it('SUPER_ADMIN remove de qualquer clínica', async () => {
    const { logo, minha, banco } = setup();
    banco['cli-B'].configuracoes.logoKey = 'logos/cli-B/y.jpg';

    await logo.remover(superAdmin, 'cli-B', CTX);

    expect((await minha.obterMinha({ ...admin('cli-B') })).logoUrl).toBeUndefined();
  });

  it('remover não apaga fisicamente nenhum objeto do bucket', async () => {
    const { logo, banco, storage } = setup();
    banco['cli-A'].configuracoes.logoKey = 'logos/cli-A/x.png';

    await logo.remover(admin('cli-A'), 'cli-A', CTX);

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('clínica inexistente: 404', async () => {
    const { logo } = setup();

    await expect(logo.remover(superAdmin, 'nao-existe', CTX)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('logo da clínica — isolamento entre clínicas', () => {
  // e)
  it('ADMIN da clínica A não solicita, não confirma e não remove a logo da clínica B (403)', async () => {
    const { logo, clinicas, storage, auditLogs, banco } = setup();
    banco['cli-B'].configuracoes.logoKey = 'logos/cli-B/y.png';

    await expect(logo.solicitarUpload(admin('cli-A'), 'cli-B', pedido(), CTX)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      logo.confirmar(admin('cli-A'), 'cli-B', { logoKey: 'logos/cli-B/z.png' }, CTX),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(logo.remover(admin('cli-A'), 'cli-B', CTX)).rejects.toBeInstanceOf(ForbiddenException);

    expect(storage.createUploadUrl).not.toHaveBeenCalled();
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(clinicas.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
    expect(banco['cli-B'].configuracoes.logoKey).toBe('logos/cli-B/y.png');
  });

  it('ADMIN sem clinicaId no token é negado mesmo informando um id', async () => {
    const { logo } = setup();

    await expect(
      logo.remover({ ...admin('cli-A'), clinicaId: undefined }, 'cli-A', CTX),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('logo da clínica — auditoria', () => {
  // f)
  it('definir/trocar grava CLINIC_LOGO_UPDATED (quem, clinicaId, ip/agent) sem dado sensível', async () => {
    const { logo, auditLogs } = setup();

    await logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: 'logos/cli-A/x.png' }, CTX);

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    const entrada = (auditLogs.create.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(entrada).toMatchObject({
      event: AuditEvent.CLINIC_LOGO_UPDATED,
      userId: 'adm-cli-A',
      email: 'adm@cli-A.test',
      ip: CTX.ip,
      userAgent: CTX.userAgent,
      metadata: { clinicaId: 'cli-A' },
    });
    expect(Object.keys(entrada.metadata as object)).toEqual(['clinicaId']);
    expect(JSON.stringify(entrada)).not.toMatch(/s3:\/\/|https:\/\/|X-Amz|logos\//);
  });

  it('remover grava CLINIC_LOGO_REMOVED; SUPER_ADMIN fica registrado como o ator da clínica alvo', async () => {
    const { logo, auditLogs } = setup();

    await logo.remover(superAdmin, 'cli-B', CTX);

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect((auditLogs.create.mock.calls[0] as unknown[])[0]).toMatchObject({
      event: AuditEvent.CLINIC_LOGO_REMOVED,
      userId: 'sa-1',
      metadata: { clinicaId: 'cli-B' },
    });
  });

  it('os eventos existem no enum', () => {
    expect(AuditEvent.CLINIC_LOGO_UPDATED).toBe('CLINIC_LOGO_UPDATED');
    expect(AuditEvent.CLINIC_LOGO_REMOVED).toBe('CLINIC_LOGO_REMOVED');
  });

  it('upload recusado (422) não grava auditoria de atualização', async () => {
    const { logo, auditLogs, storage } = setup();
    storage.headObject.mockResolvedValueOnce({ tamanho: LIMITE + 1, mimeType: 'image/png' });

    await expect(
      logo.confirmar(admin('cli-A'), 'cli-A', { logoKey: 'logos/cli-A/x.png' }, CTX),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});
