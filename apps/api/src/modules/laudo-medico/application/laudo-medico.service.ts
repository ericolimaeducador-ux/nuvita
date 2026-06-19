import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { LAUDO_MEDICO_REPOSITORY } from '../laudo-medico.constants';
import { LaudoMedico } from '../domain/laudo-medico.entity';
import { LaudoMedicoRepository } from './ports/laudo-medico.repository';
import { CreateLaudoMedicoDto } from './dto/create-laudo-medico.dto';

@Injectable()
export class LaudoMedicoService {
  constructor(@Inject(LAUDO_MEDICO_REPOSITORY) private readonly repo: LaudoMedicoRepository) {}

  async create(dto: CreateLaudoMedicoDto, user: AuthTokenPayload): Promise<LaudoMedico> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      medicoId: user.sub,
      avaliacaoIuId: dto.avaliacaoIuId,
      dataLaudo: new Date(dto.dataLaudo),
      cid10: dto.cid10,
      justificativaMedica: dto.justificativaMedica,
      fundamentoLegal: dto.fundamentoLegal,
      produtosSolicitados: dto.produtosSolicitados,
    });
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

  async assinar(id: string, crmNumero: string | undefined, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Laudo médico não encontrado.');
    if (laudo.assinado) throw new ConflictException('Laudo já assinado.');

    const dataAssinatura = new Date();
    const hash = createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'nuvita-secret')
      .update(JSON.stringify({ id: laudo.id, medicoId: user.sub, dataAssinatura: dataAssinatura.toISOString() }))
      .digest('hex');

    const signed = await this.repo.assinar(resolved, id, { medicoId: user.sub, crmNumero, dataAssinatura, hash });
    if (!signed) throw new ConflictException('Não foi possível assinar o laudo.');
    return signed;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
