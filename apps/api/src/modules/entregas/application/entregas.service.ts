import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ProcessoJuridicoService } from '../../processo-juridico/application/processo-juridico.service';
import { StatusProcesso } from '../../processo-juridico/domain/processo-juridico.entity';
import { ENTREGA_REPOSITORY } from '../entregas.constants';
import { Entrega, StatusEntrega } from '../domain/entrega.entity';
import { EntregaRepository } from './ports/entrega.repository';
import { CreateEntregaDto } from './dto/create-entrega.dto';

@Injectable()
export class EntregasService {
  constructor(
    @Inject(ENTREGA_REPOSITORY) private readonly repo: EntregaRepository,
    private readonly pacientesService: PacientesService,
    private readonly processoJuridicoService: ProcessoJuridicoService,
  ) {}

  async create(dto: CreateEntregaDto, user: AuthTokenPayload): Promise<Entrega> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      processoJuridicoId: dto.processoJuridicoId,
      avaliacaoIuId: dto.avaliacaoIuId,
      responsavelId: user.sub,
      dataEntrega: new Date(dto.dataEntrega),
      origem: dto.origem,
      status: StatusEntrega.PENDENTE,
      itens: dto.itens,
      valorTotalCentavos: dto.valorTotalCentavos,
      notaFiscal: dto.notaFiscal,
      observacoes: dto.observacoes,
    });
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

  async listByProcesso(processoJuridicoId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega[]> {
    return this.repo.listByProcesso(this.resolveClinicaId(user, clinicaId), processoJuridicoId);
  }

  async confirmarEntrega(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<Entrega> {
    const resolvedClinicaId = this.resolveClinicaId(user, clinicaId);
    const updated = await this.repo.updateStatus(resolvedClinicaId, id, StatusEntrega.ENTREGUE);
    if (!updated) throw new NotFoundException('Entrega não encontrada.');

    if (updated.processoJuridicoId) {
      const processo = await this.processoJuridicoService.findOne(updated.processoJuridicoId, resolvedClinicaId, user);
      if (processo.status === StatusProcesso.GANHO) {
        await this.pacientesService.avancarEtapaFluxo(
          resolvedClinicaId, updated.pacienteId, EtapaFluxoClinico.CONCLUIDO,
          { ip: 'internal', userAgent: 'pipeline-clinico', user },
        );
      }
    }

    return updated;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
