import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { CHECKLIST_DOCUMENTO_REPOSITORY } from '../checklist-documentos.constants';
import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../domain/checklist-documento.entity';
import { ChecklistDocumentoRepository } from './ports/checklist-documento.repository';
import { CreateChecklistDocumentoDto } from './dto/create-checklist-documento.dto';
import { UpdateChecklistDocumentoDto } from './dto/update-checklist-documento.dto';

@Injectable()
export class ChecklistDocumentosService {
  constructor(
    @Inject(CHECKLIST_DOCUMENTO_REPOSITORY) private readonly repo: ChecklistDocumentoRepository,
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
    return updated;
  }

  async delete(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<{ ok: true }> {
    const deleted = await this.repo.delete(resolveTenantClinicaId(user, clinicaId), id);
    if (!deleted) throw new NotFoundException('Item do checklist não encontrado.');
    return { ok: true };
  }
}
