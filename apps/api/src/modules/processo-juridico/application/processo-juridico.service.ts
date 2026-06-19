import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { PROCESSO_JURIDICO_REPOSITORY } from '../processo-juridico.constants';
import { ProcessoJuridico, StatusProcesso } from '../domain/processo-juridico.entity';
import { ProcessoJuridicoRepository } from './ports/processo-juridico.repository';
import { AddDocumentoProcessoDto, CreateProcessoJuridicoDto, UpdateStatusProcessoDto } from './dto/create-processo-juridico.dto';

@Injectable()
export class ProcessoJuridicoService {
  constructor(@Inject(PROCESSO_JURIDICO_REPOSITORY) private readonly repo: ProcessoJuridicoRepository) {}

  async create(dto: CreateProcessoJuridicoDto, user: AuthTokenPayload): Promise<ProcessoJuridico> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      laudoMedicoId: dto.laudoMedicoId,
      advogadoId: user.sub,
      status: StatusProcesso.EM_PREPARACAO,
      observacoes: dto.observacoes,
      documentos: [],
    });
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ProcessoJuridico> {
    const processo = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!processo) throw new NotFoundException('Processo jurídico não encontrado.');
    return processo;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ProcessoJuridico[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.findByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  async listMeus(user: AuthTokenPayload): Promise<ProcessoJuridico[]> {
    const clinicaId = this.resolveClinicaId(user, undefined);
    return this.repo.listByAdvogado(clinicaId, user.sub);
  }

  async updateStatus(id: string, dto: UpdateStatusProcessoDto, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ProcessoJuridico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const extra: Partial<ProcessoJuridico> = {};
    if (dto.numeroProcesso) extra.numeroProcesso = dto.numeroProcesso;
    if (dto.tribunal) extra.tribunal = dto.tribunal;
    if (Object.keys(extra).length) await this.repo.update(resolved, id, extra);

    const updated = await this.repo.updateStatus(resolved, id, dto.status, dto.observacoes);
    if (!updated) throw new NotFoundException('Processo não encontrado.');
    return updated;
  }

  async addDocumento(id: string, dto: AddDocumentoProcessoDto, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ProcessoJuridico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const updated = await this.repo.addDocumento(resolved, id, {
      nome: dto.nome,
      url: dto.url,
      tipo: dto.tipo,
      adicionadoEm: new Date(),
    });
    if (!updated) throw new NotFoundException('Processo não encontrado.');
    return updated;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
