import { Inject, Injectable } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { TESTE_PSICOLOGICO_REPOSITORY } from '../testes-psicologicos.constants';
import { TestePsicologico } from '../domain/teste-psicologico.entity';
import { TestePsicologicoRepository } from './ports/teste-psicologico.repository';
import { CreateTestePsicologicoDto } from './dto/create-teste-psicologico.dto';

@Injectable()
export class TestesPsicologicosService {
  constructor(
    @Inject(TESTE_PSICOLOGICO_REPOSITORY) private readonly repo: TestePsicologicoRepository,
  ) {}

  create(dto: CreateTestePsicologicoDto, user: AuthTokenPayload): Promise<TestePsicologico> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      nomeTeste: dto.nomeTeste,
      dataAplicacao: new Date(dto.dataAplicacao),
      resultado: dto.resultado,
      aplicadoPor: user.sub,
    });
  }

  listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<TestePsicologico[]> {
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }
}
