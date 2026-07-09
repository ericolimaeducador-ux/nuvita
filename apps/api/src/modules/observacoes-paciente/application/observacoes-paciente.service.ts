import { Inject, Injectable } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { OBSERVACAO_PACIENTE_REPOSITORY } from '../observacoes-paciente.constants';
import { ObservacaoPaciente } from '../domain/observacao-paciente.entity';
import { ObservacaoPacienteRepository } from './ports/observacao-paciente.repository';
import { CreateObservacaoPacienteDto } from './dto/create-observacao-paciente.dto';

@Injectable()
export class ObservacoesPacienteService {
  constructor(
    @Inject(OBSERVACAO_PACIENTE_REPOSITORY) private readonly repo: ObservacaoPacienteRepository,
  ) {}

  create(dto: CreateObservacaoPacienteDto, user: AuthTokenPayload): Promise<ObservacaoPaciente> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      autorId: user.sub,
      autorEmail: user.email,
      texto: dto.texto,
    });
  }

  listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ObservacaoPaciente[]> {
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }
}
