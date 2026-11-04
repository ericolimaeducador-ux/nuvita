// eslint-disable-next-line @typescript-eslint/no-require-imports
const { backfill, EXCLUIDO_POR } = require('../../../../../../scripts/backfill-confirmado-em.cjs');

const CRIADO = new Date('2026-09-01T10:00:00.000Z');
const AGORA = new Date('2026-10-09T12:00:00.000Z');

async function* de<T>(itens: T[]): AsyncGenerator<T> {
  for (const i of itens) yield i;
}

const doc = (id: string, tamanho = 1000) => ({ _id: id, url: `s3://b/${id}.pdf`, tamanho, criadoEm: CRIADO });

function montar(
  documentos: ReturnType<typeof doc>[],
  head: (url: string) => Promise<{ tamanho: number } | undefined>,
  apply: boolean,
) {
  const confirmar = jest.fn().mockResolvedValue(undefined);
  const softDelete = jest.fn().mockResolvedValue(undefined);
  const log = jest.fn();
  const rodar = () =>
    backfill({ documentos: de(documentos), headObject: jest.fn(head), confirmar, softDelete, apply, log, agora: AGORA });
  return { rodar, confirmar, softDelete, log };
}

describe('scripts/backfill-confirmado-em', () => {
  it('DRY-RUN: loga o que faria e NÃO grava nada', async () => {
    const t = montar(
      [doc('ok'), doc('fantasma')],
      async (url) => (url.includes('fantasma') ? undefined : { tamanho: 1000 }),
      false,
    );

    const resumo = await t.rodar();

    expect(resumo).toEqual({ confirmar: 1, softDelete: 1, divergente: 0, erro: 0 });
    expect(t.confirmar).not.toHaveBeenCalled();
    expect(t.softDelete).not.toHaveBeenCalled();
    expect(t.log.mock.calls.map(([m]: [string]) => m).join('\n')).toMatch(/DRY-RUN.*ok.*confirmadoEm/);
  });

  it('APPLY: objeto existe e tamanho bate → confirma com criadoEm; ausente → soft-delete', async () => {
    const t = montar(
      [doc('ok'), doc('fantasma')],
      async (url) => (url.includes('fantasma') ? undefined : { tamanho: 1000 }),
      true,
    );

    await t.rodar();

    expect(t.confirmar).toHaveBeenCalledWith('ok', CRIADO);
    expect(t.softDelete).toHaveBeenCalledWith('fantasma', AGORA, EXCLUIDO_POR);
    expect(t.confirmar).toHaveBeenCalledTimes(1);
    expect(t.softDelete).toHaveBeenCalledTimes(1);
  });

  it('APPLY: tamanho divergente ou HeadObject com erro → nada é gravado (só reporta)', async () => {
    const t = montar(
      [doc('diverge'), doc('r2-fora')],
      async (url) => {
        if (url.includes('r2-fora')) throw new Error('timeout');
        return { tamanho: 999 };
      },
      true,
    );

    const resumo = await t.rodar();

    expect(resumo).toEqual({ confirmar: 0, softDelete: 0, divergente: 1, erro: 1 });
    expect(t.confirmar).not.toHaveBeenCalled();
    expect(t.softDelete).not.toHaveBeenCalled();
  });
});
