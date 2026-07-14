import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { AVALIACAO_IU_REPOSITORY } from '../avaliacao-iu.constants';
import { AvaliacaoIU } from '../domain/avaliacao-iu.entity';
import { AvaliacaoIURepository } from './ports/avaliacao-iu.repository';
import { CreateAvaliacaoIUDto } from './dto/create-avaliacao-iu.dto';
import { UpdateAvaliacaoIUDto } from './dto/update-avaliacao-iu.dto';
import { Papel } from '../../../../../../packages/shared/src/auth';

@Injectable()
export class AvaliacaoIUService {
  constructor(
    @Inject(AVALIACAO_IU_REPOSITORY) private readonly repo: AvaliacaoIURepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateAvaliacaoIUDto, user: AuthTokenPayload): Promise<AvaliacaoIU> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    const avaliacao = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      enfermeiroId: user.sub,
      // Nome do profissional para a assinatura da ficha; COREN cai no registro
      // do perfil se não vier preenchido (evita redigitar toda vez).
      enfermeiroNome: user.nome,
      agendamentoId: dto.agendamentoId,
      dataAtendimento: new Date(dto.dataAtendimento),
      local: dto.local,
      prescritor: dto.prescritor,
      planoSaude: dto.planoSaude,
      hospitalReferencia: dto.hospitalReferencia,
      motivoIU: dto.motivoIU,
      inicioSintomas: dto.inicioSintomas,
      perfilCliente: dto.perfilCliente,
      destreza: dto.destreza,
      dntui: dto.dntui,
      tiposIU: dto.tiposIU,
      miccaoEspontanea: dto.miccaoEspontanea,
      volumeAproximadoMl: dto.volumeAproximadoMl,
      realizaCateterismo: dto.realizaCateterismo,
      cateterismosDia: dto.cateterismosDia,
      cateterUtilizado: dto.cateterUtilizado,
      ultimaInfeccaoUrinaria: dto.ultimaInfeccaoUrinaria,
      emTratamento: dto.emTratamento,
      tratamento: dto.tratamento,
      volumeDrenadoMl: dto.volumeDrenadoMl,
      outrasIntercorrencias: dto.outrasIntercorrencias,
      produtoIndicado: dto.produtoIndicado,
      responsavelCateterismo: dto.responsavelCateterismo,
      autorizaPesquisa: dto.autorizaPesquisa,
      aceitaInformacoes: dto.aceitaInformacoes,
      emailContato: dto.emailContato,
      whatsappContato: dto.whatsappContato,
      coren: dto.coren || user.registroProfissional,
      encaminhamento: dto.encaminhamento,
      localEncaminhamento: dto.localEncaminhamento,
      respCuidador: dto.respCuidador,
    });

    await this.pacientesService.avancarEtapaFluxo(clinicaId, avaliacao.pacienteId, EtapaFluxoClinico.AVALIACAO_IU, {
      ip: 'internal',
      userAgent: 'pipeline-clinico',
      user,
    });

    return avaliacao;
  }

  /**
   * Edita uma ficha já preenchida (ex.: completar o COREN esquecido). Não é
   * append-only: corrige o próprio registro. Faz backfill do nome do
   * profissional quem edita for o próprio autor da ficha e ela ainda não tiver
   * o nome gravado (fichas antigas, anteriores a esse campo).
   */
  async update(
    id: string,
    dto: UpdateAvaliacaoIUDto,
    clinicaId: string | undefined,
    user: AuthTokenPayload,
  ): Promise<AvaliacaoIU> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const atual = await this.repo.findById(resolved, id);
    if (!atual) throw new NotFoundException('Avaliação de IU não encontrada.');

    const { clinicaId: _ignoraClinica, dataAtendimento, ...resto } = dto;
    const patch: Partial<AvaliacaoIU> = { ...resto };
    if (dataAtendimento !== undefined) patch.dataAtendimento = new Date(dataAtendimento);
    if (!atual.enfermeiroNome && atual.enfermeiroId === user.sub && user.nome) {
      patch.enfermeiroNome = user.nome;
    }

    const atualizado = await this.repo.update(resolved, id, patch);
    if (!atualizado) throw new NotFoundException('Avaliação de IU não encontrada.');
    return atualizado;
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<AvaliacaoIU> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const av = await this.repo.findById(resolved, id);
    if (!av) throw new NotFoundException('Avaliação de IU não encontrada.');
    return av;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<AvaliacaoIU[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    const resolved = this.resolveClinicaId(user, clinicaId);
    return this.repo.listByPaciente(resolved, pacienteId);
  }

  async listMinha(user: AuthTokenPayload): Promise<AvaliacaoIU[]> {
    if (user.papel !== Papel.ENFERMEIRO) throw new ForbiddenException('Somente enfermeiros.');
    const clinicaId = this.resolveClinicaId(user, undefined);
    return this.repo.listByEnfermeiro(clinicaId, user.sub);
  }

  async contarTotal(user: AuthTokenPayload): Promise<{ total: number }> {
    const clinicaId = this.resolveClinicaId(user, undefined);
    return { total: await this.repo.countByClinica(clinicaId) };
  }

  async excluir(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<AvaliacaoIU> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const excluida = await this.repo.softDelete(resolved, id, user.sub);
    if (!excluida) throw new NotFoundException('Avaliação de IU não encontrada.');
    return excluida;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
