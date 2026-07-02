import { Inject, Injectable } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { ANOTACAO_JURIDICA_REPOSITORY } from '../anotacoes-juridicas.constants';
import { AnotacaoJuridica } from '../domain/anotacao-juridica.entity';
import { AnotacaoJuridicaRepository } from './ports/anotacao-juridica.repository';
import { CreateAnotacaoJuridicaDto } from './dto/create-anotacao-juridica.dto';

@Injectable()
export class AnotacoesJuridicasService {
  constructor(
    @Inject(ANOTACAO_JURIDICA_REPOSITORY) private readonly repo: AnotacaoJuridicaRepository,
  ) {}

  create(dto: CreateAnotacaoJuridicaDto, user: AuthTokenPayload): Promise<AnotacaoJuridica> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      autorId: user.sub,
      texto: dto.texto,
    });
  }

  listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<AnotacaoJuridica[]> {
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }
}
