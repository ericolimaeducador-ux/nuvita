import { Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

/**
 * Opção C — flag `confirmadoEm` (Date|null) no documento.
 *
 *  - createUploadUrl cria o registro com confirmadoEm = null;
 *  - confirmUpload faz HeadObject (existe + tamanho bate) e SÓ ENTÃO seta confirmadoEm;
 *  - listagem e leitura (access-url) só enxergam documentos com confirmadoEm != null;
 *  - limparNaoConfirmados() faz soft-delete de registros não confirmados com mais de 24h.
 *
 * Contratos novos assumidos (não existem hoje):
 *   storage.headObject(privateUrl): Promise<{ tamanho: number } | undefined>  (undefined = ausente; lança se R2 indisponível)
 *   repo.setConfirmadoEm(clinicaId, documentoId, quando): Promise<void>
 *   repo.listNaoConfirmadosAte(limite: Date): Promise<Documento[]>
 *   service.limparNaoConfirmados(agora?: Date): Promise<number>
 */

const DOIS_MB = 2 * 1024 * 1024;
const VINTE_E_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-10-09T12:00:00.000Z');

const baseDoc = {
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  prontuarioId: 'pront-1',
  nome: 'Laudo',
  tipo: TipoDocumento.LAUDO,
  mimeType: 'application/pdf' as const,
  tamanho: DOIS_MB,
  hash: 'ab'.repeat(32),
  uploadPor: 'user-1',
  criadoEm: new Date('2026-10-09T11:00:00.000Z'),
};

const doc = (id: string, extra: Record<string, unknown> = {}) => ({
  ...baseDoc,
  id,
  url: `s3://bucket/cli-1/pacientes/pac-1/${id}.pdf`,
  ...extra,
});

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

// Repositório em memória: guarda o estado de `confirmadoEm` para provar o efeito de cada passo.
// `list` devolve TUDO de propósito — o filtro por confirmadoEm é regra do serviço, não do fake.
function makeService(
  iniciais: Array<Record<string, unknown>>,
  headObject: jest.Mock = jest.fn().mockResolvedValue({ tamanho: DOIS_MB }),
) {
  const estado = new Map(iniciais.map((d) => [d.id as string, { ...d }]));
  const documentos = {
    create: jest.fn(async (input: Record<string, unknown>) => {
      const novo = { ...input, id: 'novo-1', criadoEm: AGORA };
      estado.set('novo-1', novo);
      return novo;
    }),
    sumActivePatientBytes: jest.fn().mockResolvedValue(0),
    findById: jest.fn(async (_c: string, id: string) => estado.get(id) ?? null),
    list: jest.fn(async () => [...estado.values()]),
    setThumbnail: jest.fn().mockResolvedValue(undefined),
    setConfirmadoEm: jest.fn(async (_c: string, id: string, quando: Date) => {
      const atual = estado.get(id);
      if (atual) atual.confirmadoEm = quando;
    }),
    listNaoConfirmadosAte: jest.fn(async (limite: Date) =>
      [...estado.values()].filter((d) => !d.confirmadoEm && new Date(d.criadoEm as Date) < limite),
    ),
    softDelete: jest.fn(async (_c: string, id: string) => estado.get(id) ?? null),
  };
  const storage = {
    createUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'https://r2/put', privateUrl: 's3://bucket/k.pdf', expiresInSeconds: 300 }),
    createReadUrl: jest.fn().mockResolvedValue('https://r2/get'),
    createThumbnailIfSupported: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    headObject,
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const pacientesService = { resumoPorIds: jest.fn().mockResolvedValue(new Map()) };
  const notificacoesService = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new DocumentosService(
    documentos as never,
    storage as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
  );
  return { service, estado, documentos, storage, auditLogs, notificacoesService, headObject };
}

const auditouConfirmacao = (auditLogs: { create: jest.Mock }) =>
  auditLogs.create.mock.calls.some(([e]) => e?.event === AuditEvent.DOCUMENT_UPLOAD_CONFIRMED);

const uploadDto = {
  pacienteId: 'pac-1',
  nome: 'Laudo',
  tipo: TipoDocumento.LAUDO,
  mimeType: 'application/pdf',
  tamanho: DOIS_MB,
  hash: 'ab'.repeat(32),
} as never;

describe('Documentos — flag confirmadoEm (opção C)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  // 1
  it('createUploadUrl cria o registro com confirmadoEm = null (explícito)', async () => {
    const { service, documentos } = makeService([]);

    await service.createUploadUrl(uploadDto, ctx);

    expect(documentos.create).toHaveBeenCalledWith(expect.objectContaining({ confirmadoEm: null }));
  });

  // 2
  it('documento com confirmadoEm = null NÃO aparece na listagem', async () => {
    const { service } = makeService([
      doc('confirmado', { confirmadoEm: new Date('2026-10-09T11:05:00.000Z') }),
      doc('pendente', { confirmadoEm: null }),
    ]);

    const lista = await service.list({ pacienteId: 'pac-1' } as never, ctx);

    expect(lista.map((d) => d.id)).toEqual(['confirmado']);
  });

  // 3
  it.each([['null', null], ['indefinido (legado sem backfill)', undefined]])(
    'documento com confirmadoEm %s NÃO pode ser aberto (access-url nega)',
    async (_nome, valor) => {
      const { service, storage } = makeService([doc('pendente', { confirmadoEm: valor })]);

      await expect(service.createAccessUrl('pendente', 'cli-1', ctx)).rejects.toBeInstanceOf(NotFoundException);

      expect(storage.createReadUrl).not.toHaveBeenCalled();
    },
  );

  // 4
  it('confirmUpload com objeto existente e tamanho batendo: seta confirmadoEm, audita, gera miniatura; depois lista e abre', async () => {
    const pendente = doc('pendente', { confirmadoEm: null });
    const { service, estado, documentos, auditLogs, storage, headObject } = makeService([pendente]);

    await expect(service.confirmUpload('pendente', 'cli-1', ctx)).resolves.toBeDefined();

    expect(headObject).toHaveBeenCalledWith(pendente.url);
    expect(documentos.setConfirmadoEm).toHaveBeenCalledWith('cli-1', 'pendente', expect.any(Date));
    expect(estado.get('pendente')?.confirmadoEm).toBeInstanceOf(Date);
    expect(auditouConfirmacao(auditLogs)).toBe(true);
    expect(storage.createThumbnailIfSupported).toHaveBeenCalledTimes(1);
    // ordem: a flag é setada ANTES da miniatura
    expect(documentos.setConfirmadoEm.mock.invocationCallOrder[0]).toBeLessThan(
      storage.createThumbnailIfSupported.mock.invocationCallOrder[0],
    );

    const lista = await service.list({ pacienteId: 'pac-1' } as never, ctx);
    expect(lista.map((d) => d.id)).toEqual(['pendente']);
    await expect(service.createAccessUrl('pendente', 'cli-1', ctx)).resolves.toMatchObject({ accessUrl: 'https://r2/get' });
  });

  // 5
  it('confirmUpload com objeto ausente: 422, confirmadoEm segue null, sem auditoria/miniatura/notificação', async () => {
    const { service, estado, documentos, auditLogs, storage, notificacoesService } = makeService(
      [doc('pendente', { confirmadoEm: null })],
      jest.fn().mockResolvedValue(undefined),
    );

    await expect(service.confirmUpload('pendente', 'cli-1', ctx)).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(estado.get('pendente')?.confirmadoEm).toBeNull();
    expect(documentos.setConfirmadoEm).not.toHaveBeenCalled();
    expect(auditouConfirmacao(auditLogs)).toBe(false);
    expect(storage.createThumbnailIfSupported).not.toHaveBeenCalled();
    expect(notificacoesService.create).not.toHaveBeenCalled();
  });

  // 6
  it('confirmUpload com tamanho divergente: 422 e confirmadoEm segue null', async () => {
    const { service, estado, documentos, auditLogs, storage } = makeService(
      [doc('pendente', { confirmadoEm: null })],
      jest.fn().mockResolvedValue({ tamanho: DOIS_MB - 1 }),
    );

    await expect(service.confirmUpload('pendente', 'cli-1', ctx)).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(estado.get('pendente')?.confirmadoEm).toBeNull();
    expect(documentos.setConfirmadoEm).not.toHaveBeenCalled();
    expect(auditouConfirmacao(auditLogs)).toBe(false);
    expect(storage.createThumbnailIfSupported).not.toHaveBeenCalled();
  });

  // 7
  it('HeadObject com R2 fora do ar/timeout: o confirm falha e confirmadoEm segue null', async () => {
    const { service, estado, documentos, auditLogs, storage } = makeService(
      [doc('pendente', { confirmadoEm: null })],
      jest.fn().mockRejectedValue(new Error('R2 timeout')),
    );

    await expect(service.confirmUpload('pendente', 'cli-1', ctx)).rejects.toThrow();

    expect(estado.get('pendente')?.confirmadoEm).toBeNull();
    expect(documentos.setConfirmadoEm).not.toHaveBeenCalled();
    expect(auditouConfirmacao(auditLogs)).toBe(false);
    expect(storage.createThumbnailIfSupported).not.toHaveBeenCalled();
  });

  // 8
  describe('limpeza de registros não confirmados', () => {
    it('soft-delete só de confirmadoEm = null com mais de 24h; confirmado NUNCA é tocado', async () => {
      const velho = new Date(AGORA.getTime() - VINTE_E_QUATRO_HORAS_MS - 60_000);
      const recente = new Date(AGORA.getTime() - VINTE_E_QUATRO_HORAS_MS + 60_000);
      const { service, documentos } = makeService([
        doc('pendente-velho', { confirmadoEm: null, criadoEm: velho }),
        doc('pendente-recente', { confirmadoEm: null, criadoEm: recente }),
        doc('confirmado-velho', { confirmadoEm: new Date(velho.getTime() + 1000), criadoEm: velho }),
      ]);

      const removidos = await (service as unknown as { limparNaoConfirmados(agora: Date): Promise<number> }).limparNaoConfirmados(AGORA);

      expect(removidos).toBe(1);
      expect(documentos.listNaoConfirmadosAte).toHaveBeenCalledWith(new Date(AGORA.getTime() - VINTE_E_QUATRO_HORAS_MS));
      const ids = documentos.softDelete.mock.calls.map(([, id]) => id);
      expect(ids).toEqual(['pendente-velho']);
    });

    it('defesa em profundidade: mesmo que o repositório devolva um confirmado, a limpeza o ignora', async () => {
      const velho = new Date(AGORA.getTime() - 2 * VINTE_E_QUATRO_HORAS_MS);
      const { service, documentos } = makeService([doc('confirmado-velho', { confirmadoEm: velho, criadoEm: velho })]);
      documentos.listNaoConfirmadosAte.mockResolvedValue([doc('confirmado-velho', { confirmadoEm: velho, criadoEm: velho })]);

      await (service as unknown as { limparNaoConfirmados(agora: Date): Promise<number> }).limparNaoConfirmados(AGORA);

      expect(documentos.softDelete).not.toHaveBeenCalled();
    });
  });

  // 9
  it('documento ANTIGO já confirmado (confirmadoEm preenchido) continua listando e abrindo, sem chamar HeadObject', async () => {
    const { service, headObject, storage } = makeService([
      doc('antigo', { confirmadoEm: new Date('2026-01-01T00:00:00.000Z'), criadoEm: new Date('2026-01-01T00:00:00.000Z') }),
    ]);

    const lista = await service.list({ pacienteId: 'pac-1' } as never, ctx);
    expect(lista.map((d) => d.id)).toEqual(['antigo']);

    await expect(service.createAccessUrl('antigo', 'cli-1', ctx)).resolves.toMatchObject({ accessUrl: 'https://r2/get' });
    expect(storage.createReadUrl).toHaveBeenCalledTimes(1);
    expect(headObject).not.toHaveBeenCalled();
  });

  // Backfill (o script vem depois do GREEN): documento legado sem confirmadoEm fica oculto até a migração.
  it('legado com confirmadoEm indefinido fica oculto na listagem até o backfill (documenta a necessidade da migração)', async () => {
    const { service } = makeService([doc('legado', {})]);

    const lista = await service.list({ pacienteId: 'pac-1' } as never, ctx);

    expect(lista).toEqual([]);
  });
});
