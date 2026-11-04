import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { Produto, TipoProduto } from '../domain/produto.entity';
import { PRODUTO_REPOSITORY } from '../produtos.constants';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { ProdutoRepository } from './ports/produto.repository';

export interface ProdutoAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

function ehCodigoDuplicado(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false;
  const e = erro as { code?: number };
  return e.code === 11000;
}

/**
 * Catálogo operacional (global). O catálogo NÃO é semeado: começa vazio e é preenchido pelo ADMIN (ou por uma lista
 * fornecida depois — ver scripts/seed-produtos.mjs). Leitura: equipe; alteração: ADMIN/SUPER_ADMIN (o controller exige o papel;
 * a checagem aqui é a segunda trava).
 */
@Injectable()
export class ProdutosService {
  constructor(
    @Inject(PRODUTO_REPOSITORY) private readonly produtos: ProdutoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  /** Lista para a equipe: só produtos ativos. Só ADMIN/SUPER_ADMIN podem pedir os inativos junto. */
  async listar(tipo: TipoProduto | undefined, incluirInativos: boolean | undefined, user: AuthTokenPayload): Promise<Produto[]> {
    const podeVerInativos = user.papel === Papel.ADMIN || user.papel === Papel.SUPER_ADMIN;
    return this.produtos.findAll(tipo, incluirInativos && podeVerInativos ? undefined : true);
  }

  async buscarPorCodigo(codigo: number): Promise<Produto | null> {
    return this.produtos.findByCodigo(codigo);
  }

  /** Busca para a API (404 quando não existe). */
  async obter(codigo: number): Promise<Produto> {
    const produto = await this.produtos.findByCodigo(codigo);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    return produto;
  }

  async criar(dto: CreateProdutoDto, context: ProdutoAuditContext): Promise<Produto> {
    this.assertPodeAlterar(context.user);
    // Pré-checagem (o índice único também protege, mas fora de development os índices são criados por migração/ops).
    if (await this.produtos.findByCodigo(dto.codigo)) throw new ConflictException('Ja existe um produto com este codigo.');
    let produto: Produto;
    try {
      produto = await this.produtos.create(dto);
    } catch (erro) {
      if (ehCodigoDuplicado(erro)) throw new ConflictException('Ja existe um produto com este codigo.');
      throw erro;
    }
    await this.audit(AuditEvent.PRODUTO_CREATED, context, { codigo: produto.codigo, tipo: produto.tipo });
    return produto;
  }

  async atualizar(codigo: number, dto: UpdateProdutoDto, context: ProdutoAuditContext): Promise<Produto> {
    this.assertPodeAlterar(context.user);
    const produto = await this.produtos.update(codigo, dto);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    await this.audit(AuditEvent.PRODUTO_UPDATED, context, { codigo, campos: Object.keys(dto) });
    return produto;
  }

  /** Remoção lógica (ativo=false). Entregas antigas continuam apontando para o código. */
  async desativar(codigo: number, context: ProdutoAuditContext): Promise<Produto> {
    this.assertPodeAlterar(context.user);
    const produto = await this.produtos.deactivate(codigo);
    if (!produto) throw new NotFoundException('Produto nao encontrado.');
    await this.audit(AuditEvent.PRODUTO_DEACTIVATED, context, { codigo });
    return produto;
  }

  private assertPodeAlterar(user: AuthTokenPayload): void {
    if (user.papel !== Papel.ADMIN && user.papel !== Papel.SUPER_ADMIN) {
      throw new ForbiddenException('Somente ADMIN pode alterar o catalogo de produtos.');
    }
  }

  private async audit(event: AuditEvent, context: ProdutoAuditContext, metadata: Record<string, unknown>): Promise<void> {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      // Catálogo global: o tenant do ator vai no log só para rastreio de quem mexeu.
      metadata: { ...metadata, ...(context.user.clinicaId ? { clinicaId: context.user.clinicaId } : {}) },
    });
  }
}
