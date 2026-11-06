import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AvaliacaoIUService } from '../../avaliacao-iu/application/avaliacao-iu.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { TipoProduto } from '../../produtos/domain/produto.entity';
import { ENTREGA_REPOSITORY } from '../entregas.constants';
import { CategoriaInsumo, Entrega, ItemEntrega, StatusEntrega } from '../domain/entrega.entity';
import { EntregaRepository } from './ports/entrega.repository';
import { CreateEntregaDto } from './dto/create-entrega.dto';

export interface EntregaAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

// Mapeamento vive aqui (não em `produtos`) para não acoplar o domínio do catálogo a um conceito de relatório que ele não
// precisa conhecer. TODO(conteudo): "sonda"/"coletor" são categorias de IU.
const CATEGORIA_POR_TIPO_PRODUTO: Record<string, CategoriaInsumo> = {
  [TipoProduto.CATETER_VAPRO]: CategoriaInsumo.SONDA,
  [TipoProduto.CATETER_SAMTRONIC]: CategoriaInsumo.SONDA,
  [TipoProduto.COLETOR_ACTICOAT]: CategoriaInsumo.COLETOR,
};

// `tipo` do produto é texto livre: linha nova (ex.: cateter_cure_dextra) cai na categoria pelo prefixo; sem pista -> OUTRO.
export function categoriaDoTipo(tipo: string): CategoriaInsumo {
  const exata = CATEGORIA_POR_TIPO_PRODUTO[tipo];
  if (exata) return exata;
  if (/^(cateter|sonda)_/i.test(tipo)) return CategoriaInsumo.SONDA;
  if (/^coletor_/i.test(tipo)) return CategoriaInsumo.COLETOR;
  return CategoriaInsumo.OUTRO;
}

@Injectable()
export class EntregasService {
  constructor(
    @Inject(ENTREGA_REPOSITORY) private readonly repo: EntregaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly pacientesService: PacientesService,
    private readonly produtosService: ProdutosService,
    private readonly avaliacaoIU: AvaliacaoIUService,
  ) {}

  async create(dto: CreateEntregaDto, context: EntregaAuditContext): Promise<Entrega> {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    // O paciente precisa ser da clínica do token (nunca confiar no id do payload).
    const resumo = await this.pacientesService.resumoPorIds(clinicaId, [dto.pacienteId]);
    if (!resumo.has(dto.pacienteId)) throw new NotFoundException('Paciente nao encontrado.');
    // Referência à avaliação (quando vem): existe, é desta clínica e deste paciente.
    if (dto.avaliacaoIuId && !(await this.avaliacaoIU.pertenceAoPaciente(clinicaId, dto.avaliacaoIuId, dto.pacienteId))) {
      throw new NotFoundException('Avaliacao de IU nao encontrada.');
    }

    // R1.6: o total NUNCA é aceito do cliente — é recalculado a partir dos itens; divergência = 400 (nada gravado).
    const valorTotalCentavos = this.totalConferido(dto);
    const itens = await this.categorizarItens(dto.itens);
    const entrega = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      responsavelId: context.user.sub,
      dataEntrega: new Date(dto.dataEntrega),
      origem: dto.origem,
      status: StatusEntrega.PENDENTE,
      itens,
      valorTotalCentavos,
      notaFiscal: dto.notaFiscal,
      observacoes: dto.observacoes,
    });

    // Metadata só com ids e contagens (sem nota fiscal, observações nem dado do paciente).
    await this.audit(AuditEvent.ENTREGA_CREATED, context, {
      clinicaId,
      entregaId: entrega.id,
      pacienteId: entrega.pacienteId,
      origem: entrega.origem,
      itens: itens.length,
    });

    return entrega;
  }

  /** Total = soma de quantidade × valor unitário de cada item; o informado (item e entrega) tem de bater. */
  private totalConferido(dto: CreateEntregaDto): number {
    let total = 0;
    dto.itens.forEach((item, i) => {
      const esperado = item.quantidade * item.valorUnitarioCentavos;
      if (item.valorTotalCentavos !== esperado) {
        throw new BadRequestException(`Total do item ${i + 1} nao confere com quantidade x valor unitario.`);
      }
      total += esperado;
    });
    if (!Number.isSafeInteger(total)) throw new BadRequestException('Total da entrega invalido.');
    if (dto.valorTotalCentavos !== total) throw new BadRequestException('Total da entrega nao confere com a soma dos itens.');
    return total;
  }

  /**
   * Deriva `categoria` de cada item a partir do `tipo` do produto do catálogo — nunca aceita do cliente (ver
   * ItemEntregaDto). Item cujo código não corresponde a nenhum produto cadastrado fica sem categoria (excluído dos
   * relatórios por categoria, não bloqueia a entrega).
   */
  private async categorizarItens(itens: CreateEntregaDto['itens']): Promise<ItemEntrega[]> {
    return Promise.all(
      itens.map(async (item) => {
        const produto = await this.produtosService.buscarPorCodigo(item.codigo);
        const categoria = produto ? categoriaDoTipo(produto.tipo) : undefined;
        return { ...item, categoria };
      }),
    );
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega> {
    const entrega = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!entrega) throw new NotFoundException('Entrega nao encontrada.');
    return entrega;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId e obrigatorio.');
    return this.repo.listByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  /**
   * Confirma a entrega (ENTREGUE) e tenta levar o paciente para CONCLUIDO no fluxo clínico. O avanço é do
   * PacientesService.avancarEtapaFluxo: só para frente, só para paciente ELEGÍVEL ao fluxo (classificado exatamente como IU)
   * e sem nunca lançar. Entrega de paciente fora do fluxo (ou sem etapa) confirma normalmente e NÃO muda etapa.
   */
  async confirmarEntrega(id: string, clinicaId: string | undefined, context: EntregaAuditContext): Promise<Entrega> {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const updated = await this.repo.updateStatus(resolvedClinicaId, id, StatusEntrega.ENTREGUE);
    if (!updated) throw new NotFoundException('Entrega nao encontrada.');

    await this.audit(AuditEvent.ENTREGA_CONFIRMED, context, {
      clinicaId: resolvedClinicaId,
      entregaId: updated.id,
      pacienteId: updated.pacienteId,
    });

    await this.pacientesService.avancarEtapaFluxo(
      resolvedClinicaId,
      updated.pacienteId,
      EtapaFluxoClinico.CONCLUIDO,
      { ip: context.ip, userAgent: context.userAgent, user: context.user },
    );

    return updated;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    return resolveTenantClinicaId(user, requested);
  }

  private async audit(event: AuditEvent, context: EntregaAuditContext, metadata: Record<string, unknown>): Promise<void> {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
