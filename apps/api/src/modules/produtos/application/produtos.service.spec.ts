import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { EmbalagemProduto, Produto, ProjetoCatalogo, SexoProduto, TipoProduto } from '../domain/produto.entity';
import { ListProdutosQueryDto } from './dto/list-produtos-query.dto';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { ProdutoAuditContext, ProdutosService } from './produtos.service';
import { ProdutoRepository } from './ports/produto.repository';

function ctx(papel: Papel): ProdutoAuditContext {
  return {
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: { sub: 'u1', email: 'u@nuvita.test', papel, clinicaId: 'clinica-1', jti: 'jti', typ: 'access' },
  };
}

const dto: CreateProdutoDto = {
  codigo: 500,
  nome: 'Produto de teste',
  tipo: TipoProduto.CATETER_VAPRO,
  sexo: SexoProduto.UNIVERSAL,
  embalagem: EmbalagemProduto.STANDARD,
  projeto: ProjetoCatalogo.ALPHA,
  descricaoTecnica: 'Descrição de teste.',
};

const produtoSalvo = { id: 'p1', ...dto, ativo: true, criadoEm: new Date(), atualizadoEm: new Date() } as Produto;

function montar(repo: Partial<Record<keyof ProdutoRepository, jest.Mock>>) {
  const auditCreate = jest.fn().mockResolvedValue(undefined);
  const service = new ProdutosService(repo as unknown as ProdutoRepository, { create: auditCreate } as unknown as AuditLogRepository);
  return { service, auditCreate };
}

describe('ProdutosService — catálogo operacional', () => {
  it('NÃO semeia produtos: o catálogo começa vazio (nenhum hook de bootstrap)', () => {
    const { service } = montar({});
    expect((service as unknown as { onApplicationBootstrap?: unknown }).onApplicationBootstrap).toBeUndefined();
    expect((service as unknown as { seedCatalogo?: unknown }).seedCatalogo).toBeUndefined();
  });

  describe('listar', () => {
    it.each([Papel.ENFERMEIRO, Papel.SECRETARIA])('%s só enxerga produtos ativos, mesmo pedindo inativos', async (papel) => {
      const findAll = jest.fn().mockResolvedValue([]);
      const { service } = montar({ findAll });

      await service.listar(undefined, true, ctx(papel).user);

      expect(findAll).toHaveBeenCalledWith(undefined, true);
    });

    it.each([Papel.ADMIN, Papel.SUPER_ADMIN])('%s pode pedir os inativos junto', async (papel) => {
      const findAll = jest.fn().mockResolvedValue([]);
      const { service } = montar({ findAll });

      await service.listar(TipoProduto.CATETER_VAPRO, true, ctx(papel).user);
      expect(findAll).toHaveBeenLastCalledWith(TipoProduto.CATETER_VAPRO, undefined);

      await service.listar(undefined, false, ctx(papel).user);
      expect(findAll).toHaveBeenLastCalledWith(undefined, true);
    });
  });

  describe('criar / atualizar / desativar', () => {
    it.each([Papel.ENFERMEIRO, Papel.SECRETARIA, Papel.PACIENTE])('%s não altera o catálogo (403, nada gravado)', async (papel) => {
      const create = jest.fn();
      const update = jest.fn();
      const deactivate = jest.fn();
      const { service } = montar({ create, update, deactivate });

      await expect(service.criar(dto, ctx(papel))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.atualizar(500, { nome: 'x' }, ctx(papel))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.desativar(500, ctx(papel))).rejects.toBeInstanceOf(ForbiddenException);
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(deactivate).not.toHaveBeenCalled();
    });

    it('ADMIN cria e a criação é auditada (PRODUTO_CREATED)', async () => {
      const create = jest.fn().mockResolvedValue(produtoSalvo);
      const { service, auditCreate } = montar({ create, findByCodigo: jest.fn().mockResolvedValue(null) });

      const criado = await service.criar(dto, ctx(Papel.ADMIN));

      expect(criado.codigo).toBe(500);
      expect(auditCreate.mock.calls[0][0]).toMatchObject({ event: AuditEvent.PRODUTO_CREATED, metadata: { codigo: 500 } });
    });

    it('código já existente → 409 (pré-checagem e violação do índice único)', async () => {
      const create = jest.fn();
      const preChecagem = montar({ create, findByCodigo: jest.fn().mockResolvedValue(produtoSalvo) });
      await expect(preChecagem.service.criar(dto, ctx(Papel.ADMIN))).rejects.toBeInstanceOf(ConflictException);
      expect(create).not.toHaveBeenCalled();

      const indice = montar({ create: jest.fn().mockRejectedValue({ code: 11000 }), findByCodigo: jest.fn().mockResolvedValue(null) });
      await expect(indice.service.criar(dto, ctx(Papel.ADMIN))).rejects.toBeInstanceOf(ConflictException);
    });

    it('SUPER_ADMIN também altera; atualizar e desativar são auditados', async () => {
      const update = jest.fn().mockResolvedValue(produtoSalvo);
      const deactivate = jest.fn().mockResolvedValue({ ...produtoSalvo, ativo: false });
      const { service, auditCreate } = montar({ update, deactivate });

      await service.atualizar(500, { nome: 'Novo nome' }, ctx(Papel.SUPER_ADMIN));
      await service.desativar(500, ctx(Papel.SUPER_ADMIN));

      expect(auditCreate.mock.calls.map((c) => c[0].event)).toEqual([AuditEvent.PRODUTO_UPDATED, AuditEvent.PRODUTO_DEACTIVATED]);
      expect(auditCreate.mock.calls[0][0].metadata).toMatchObject({ codigo: 500, campos: ['nome'] });
    });

    it('produto inexistente → 404 em atualizar, desativar e obter', async () => {
      const { service } = montar({
        update: jest.fn().mockResolvedValue(null),
        deactivate: jest.fn().mockResolvedValue(null),
        findByCodigo: jest.fn().mockResolvedValue(null),
      });

      await expect(service.atualizar(1, { nome: 'x' }, ctx(Papel.ADMIN))).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.desativar(1, ctx(Papel.ADMIN))).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.obter(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('DTOs do catálogo', () => {
  const opcoes = { whitelist: true, forbidNonWhitelisted: true };
  const errosCriar = async (over: Record<string, unknown>) =>
    (await validate(plainToInstance(CreateProdutoDto, { ...dto, ...over }), opcoes)).map((e) => e.property);

  it('produto válido é aceito', async () => {
    expect(await errosCriar({})).toEqual([]);
  });

  it.each([
    ['sem código', { codigo: undefined }, 'codigo'],
    ['código zero', { codigo: 0 }, 'codigo'],
    ['tipo vazio', { tipo: '' }, 'tipo'],
    ['tipo só com espaços', { tipo: '   ' }, 'tipo'],
    ['tipo que não é texto', { tipo: 5 }, 'tipo'],
    ['sem tipo', { tipo: undefined }, 'tipo'],
    ['nome vazio', { nome: '' }, 'nome'],
    ['campo desconhecido (ativo não é editável pelo cliente)', { ativo: false }, 'ativo'],
  ])('%s: recusado', async (_nome, over, campo) => {
    expect(await errosCriar(over)).toContain(campo);
  });

  it('linha nova (fora dos valores já conhecidos) é aceita e o tipo vem com trim', async () => {
    const inst = plainToInstance(CreateProdutoDto, { ...dto, tipo: '  cateter_cure_dextra  ' });
    expect(await validate(inst, opcoes)).toEqual([]);
    expect(inst.tipo).toBe('cateter_cure_dextra');
  });

  it('os valores já gravados continuam válidos', async () => {
    for (const tipo of Object.values(TipoProduto)) {
      expect(await errosCriar({ tipo })).toEqual([]);
    }
  });

  it('filtro por tipo na listagem: vazio recusado, texto livre aceito', async () => {
    const erros = async (tipo: unknown) =>
      (await validate(plainToInstance(ListProdutosQueryDto, { tipo }), opcoes)).map((e) => e.property);
    expect(await erros('')).toContain('tipo');
    expect(await erros('cateter_cure_dextra')).toEqual([]);
  });

  it('o código não pode ser alterado por PATCH', async () => {
    const erros = (await validate(plainToInstance(UpdateProdutoDto, { codigo: 9 }), opcoes)).map((e) => e.property);
    expect(erros).toContain('codigo');
  });
});
