import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload, DOCUMENTOS_PADRAO } from '../../../../../../packages/shared/src';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { CHECKLIST_DOCUMENTO_REPOSITORY } from '../checklist-documentos.constants';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../domain/checklist-documento.entity';
import { ChecklistDocumentoRepository } from './ports/checklist-documento.repository';
import { CreateChecklistDocumentoDto } from './dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from './dto/update-checklist-documento.dto';
import { CriarChecklistPadraoDto } from './dto/criar-checklist-padrao.dto';

@Injectable()
export class ChecklistDocumentosService {
  constructor(
    @Inject(CHECKLIST_DOCUMENTO_REPOSITORY) private readonly repo: ChecklistDocumentoRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  create(dto: CreateChecklistDocumentoDto, user: AuthTokenPayload): Promise<ChecklistDocumentoItem> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      nome: dto.nome,
      status: StatusChecklistDocumento.PENDENTE,
      observacao: dto.observacao,
      criadoPor: user.sub,
    });
  }

  listByPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    user: AuthTokenPayload,
  ): Promise<ChecklistDocumentoItem[]> {
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }

  async update(
    id: string,
    dto: UpdateChecklistDocumentoDto,
    user: AuthTokenPayload,
  ): Promise<ChecklistDocumentoItem> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    const updated = await this.repo.update(clinicaId, id, dto);
    if (!updated) throw new NotFoundException('Item do checklist não encontrado.');

    if (dto.status === StatusChecklistDocumento.RECEBIDO) {
      const itens = await this.repo.listByPaciente(clinicaId, updated.pacienteId);
      const completo = itens.length > 0 && itens.every((i) => i.status === StatusChecklistDocumento.RECEBIDO);
      if (completo) {
        await this.pacientesService.avancarEtapaFluxo(
          clinicaId, updated.pacienteId, EtapaFluxoClinico.AGUARDANDO_CONSULTA_MEDICA,
          { ip: 'internal', userAgent: 'pipeline-clinico', user },
        );
      }
    }

    return updated;
  }

  async delete(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<{ ok: true }> {
    const deleted = await this.repo.delete(resolveTenantClinicaId(user, clinicaId), id);
    if (!deleted) throw new NotFoundException('Item do checklist não encontrado.');
    return { ok: true };
  }

  /** Cria de uma vez os itens da lista padrão que o paciente ainda não tem (por nome). */
  async criarPadrao(dto: CriarChecklistPadraoDto, user: AuthTokenPayload): Promise<ChecklistDocumentoItem[]> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    const existentes = await this.repo.listByPaciente(clinicaId, dto.pacienteId);
    const nomesExistentes = new Set(existentes.map((i) => i.nome.trim().toLowerCase()));
    const faltantes = DOCUMENTOS_PADRAO.filter((nome) => !nomesExistentes.has(nome.trim().toLowerCase()));

    const criados = await Promise.all(
      faltantes.map((nome) =>
        this.repo.create({
          clinicaId,
          pacienteId: dto.pacienteId,
          nome,
          status: StatusChecklistDocumento.PENDENTE,
          criadoPor: user.sub,
        }),
      ),
    );
    return [...criados, ...existentes];
  }

  resumoPendentes(clinicaId: string | undefined, user: AuthTokenPayload): Promise<{ pendentes: number }> {
    return this.repo
      .countPendentesPorClinica(resolveTenantClinicaId(user, clinicaId))
      .then((pendentes) => ({ pendentes }));
  }
}
