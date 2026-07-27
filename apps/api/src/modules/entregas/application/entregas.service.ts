import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { TipoProduto } from '../../produtos/domain/produto.entity';
import { ENTREGA_REPOSITORY } from '../entregas.constants';
import { CategoriaInsumo, Entrega, ItemEntrega, StatusEntrega } from '../domain/entrega.entity';
import { EntregaRepository } from './ports/entrega.repository';
import { CreateEntregaDto } from './dto/create-entrega.dto';

// Mapeamento vive aqui (não em `produtos`) para não acoplar o domínio do
// catálogo a um conceito de relatório que ele não precisa conhecer.
const CATEGORIA_POR_TIPO_PRODUTO: Record<TipoProduto, CategoriaInsumo> = {
  [TipoProduto.CATETER_VAPRO]: CategoriaInsumo.SONDA,
  [TipoProduto.CATETER_SAMTRONIC]: CategoriaInsumo.SONDA,
  [TipoProduto.COLETOR_ACTICOAT]: CategoriaInsumo.COLETOR,
};

@Injectable()
export class EntregasService {
  constructor(
    @Inject(ENTREGA_REPOSITORY) private readonly repo: EntregaRepository,
    private readonly pacientesService: PacientesService,
    private readonly produtosService: ProdutosService,
  ) {}

  async create(dto: CreateEntregaDto, user: AuthTokenPayload): Promise<Entrega> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    const itens = await this.categorizarItens(dto.itens);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      responsavelId: user.sub,
      dataEntrega: new Date(dto.dataEntrega),
      origem: dto.origem,
      status: StatusEntrega.PENDENTE,
      itens,
      valorTotalCentavos: dto.valorTotalCentavos,
      notaFiscal: dto.notaFiscal,
      observacoes: dto.observacoes,
    });
  }

  /**
   * Deriva `categoria` de cada item a partir do `tipo` do produto do
   * catálogo — nunca aceita do cliente (ver ItemEntregaDto). Item cujo
   * código não corresponde a nenhum produto cadastrado fica sem categoria
   * (excluído dos relatórios por categoria, não bloqueia a entrega).
   */
  private async categorizarItens(itens: CreateEntregaDto['itens']): Promise<ItemEntrega[]> {
    return Promise.all(
      itens.map(async (item) => {
        const produto = await this.produtosService.buscarPorCodigo(item.codigo);
        const categoria = produto ? CATEGORIA_POR_TIPO_PRODUTO[produto.tipo] : undefined;
        return { ...item, categoria };
      }),
    );
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega> {
    const entrega = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!entrega) throw new NotFoundException('Entrega não encontrada.');
    return entrega;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.listByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  async confirmarEntrega(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega> {
    const resolvedClinicaId = this.resolveClinicaId(user, clinicaId);
    const updated = await this.repo.updateStatus(resolvedClinicaId, id, StatusEntrega.ENTREGUE);
    if (!updated) throw new NotFoundException('Entrega não encontrada.');

    await this.pacientesService.avancarEtapaFluxo(
      resolvedClinicaId, updated.pacienteId, EtapaFluxoClinico.CONCLUIDO,
      { ip: 'internal', userAgent: 'pipeline-clinico', user },
    );

    return updated;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
