import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { LAUDO_MEDICO_REPOSITORY } from '../laudo-medico.constants';
import { LaudoMedico, StatusLaudoMedico } from '../domain/laudo-medico.entity';
import { LaudoMedicoRepository } from './ports/laudo-medico.repository';
import { CreateLaudoMedicoDto } from './dto/create-laudo-medico.dto';
import { UpdateLaudoMedicoDto } from './dto/update-laudo-medico.dto';

const PODE_REVISAR = [Papel.MEDICO, Papel.ADMIN];

@Injectable()
export class LaudoMedicoService {
  constructor(
    @Inject(LAUDO_MEDICO_REPOSITORY) private readonly repo: LaudoMedicoRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateLaudoMedicoDto, user: AuthTokenPayload): Promise<LaudoMedico> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      criadoPorId: user.sub,
      criadoPorNome: user.nome,
      criadoPorPapel: user.papel,
      status: StatusLaudoMedico.RASCUNHO,
      avaliacaoIuId: dto.avaliacaoIuId,
      dataLaudo: new Date(dto.dataLaudo),
      cid10: dto.cid10,
      justificativaMedica: dto.justificativaMedica,
      fundamentoLegal: dto.fundamentoLegal,
      produtosSolicitados: dto.produtosSolicitados,
    });
  }

  async update(id: string, dto: UpdateLaudoMedicoDto, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Relatório médico não encontrado.');
    if (laudo.status === StatusLaudoMedico.ASSINADO) throw new ConflictException('Relatório já assinado não pode ser editado.');
    this.assertPodeEditar(laudo, user);

    const patch: Partial<LaudoMedico> = {};
    if (dto.dataLaudo !== undefined) patch.dataLaudo = new Date(dto.dataLaudo);
    if (dto.cid10 !== undefined) patch.cid10 = dto.cid10;
    if (dto.justificativaMedica !== undefined) patch.justificativaMedica = dto.justificativaMedica;
    if (dto.fundamentoLegal !== undefined) patch.fundamentoLegal = dto.fundamentoLegal;
    if (dto.produtosSolicitados !== undefined) patch.produtosSolicitados = dto.produtosSolicitados;

    const atualizado = await this.repo.update(resolved, id, patch);
    if (!atualizado) throw new ConflictException('Não foi possível atualizar o relatório médico.');
    return atualizado;
  }

  async encaminharParaRevisao(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Relatório médico não encontrado.');
    if (laudo.status !== StatusLaudoMedico.RASCUNHO) throw new ConflictException('Só é possível encaminhar relatórios em rascunho.');
    this.assertPodeEditar(laudo, user);

    const atualizado = await this.repo.update(resolved, id, { status: StatusLaudoMedico.AGUARDANDO_REVISAO });
    if (!atualizado) throw new ConflictException('Não foi possível encaminhar o relatório médico.');
    return atualizado;
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const laudo = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!laudo) throw new NotFoundException('Laudo médico não encontrado.');
    return laudo;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.listByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  async listPendentesRevisao(clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico[]> {
    return this.repo.listByStatus(this.resolveClinicaId(user, clinicaId), StatusLaudoMedico.AGUARDANDO_REVISAO);
  }

  async assinar(id: string, crmNumero: string | undefined, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Laudo médico não encontrado.');
    if (laudo.status === StatusLaudoMedico.ASSINADO) throw new ConflictException('Laudo já assinado.');

    const dataAssinatura = new Date();
    const hash = createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'nuvita-secret')
      .update(JSON.stringify({ id: laudo.id, medicoId: user.sub, dataAssinatura: dataAssinatura.toISOString() }))
      .digest('hex');

    const signed = await this.repo.assinar(resolved, id, { medicoId: user.sub, crmNumero, dataAssinatura, hash });
    if (!signed) throw new ConflictException('Não foi possível assinar o laudo.');

    await this.pacientesService.avancarEtapaFluxo(
      resolved, signed.pacienteId, EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO,
      { ip: 'internal', userAgent: 'pipeline-clinico', user },
    );

    return signed;
  }

  /** Só quem criou o rascunho (enquanto ainda é rascunho) ou um revisor (médico/admin) pode editar/encaminhar. */
  private assertPodeEditar(laudo: LaudoMedico, user: AuthTokenPayload): void {
    const ehRevisor = (PODE_REVISAR as Papel[]).includes(user.papel);
    const ehAutorEmRascunho = laudo.criadoPorId === user.sub && laudo.status === StatusLaudoMedico.RASCUNHO;
    if (!ehRevisor && !ehAutorEmRascunho) {
      throw new ForbiddenException('Você não tem permissão para editar este relatório médico.');
    }
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
