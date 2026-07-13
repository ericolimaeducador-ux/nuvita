import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { RequestMeta } from '../../../common/http/client-ip';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import {
  SALA_EVENTO_REPOSITORY,
  SALA_TELEMEDICINA_REPOSITORY,
  SINAL_SALA_REPOSITORY,
} from '../telemedicina.constants';
import {
  ModalidadeAtendimento,
  SALA_TTL_HORAS,
  SalaTelemedicina,
  StatusSala,
} from '../domain/sala-telemedicina.entity';
import { PapelSala, TipoEventoSala } from '../domain/sala-evento.entity';
import { TipoSinal } from '../domain/sinal-sala.entity';
import { CreateSalaDto } from './dto/create-sala.dto';
import { EnviarSinalDto } from './dto/enviar-sinal.dto';
import { ListSalasQueryDto } from './dto/list-salas-query.dto';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';
import { SalaTelemedicinaRepository } from './ports/sala-telemedicina.repository';
import { SalaEventoRepository } from './ports/sala-evento.repository';
import { SinalSalaRepository } from './ports/sinal-sala.repository';

export interface RequestAuditContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

/** Visão da sala segura para quem entra só com o token (sem IDs internos nem tokens). */
export interface SalaAcessoView {
  salaId: string;
  papel: PapelSala;
  status: StatusSala;
  modalidade: ModalidadeAtendimento;
  expiresAt: Date;
  iniciadaEm?: Date;
  encerradaEm?: Date;
}

@Injectable()
export class TelemedicinaService {
  constructor(
    @Inject(SALA_TELEMEDICINA_REPOSITORY) private readonly salas: SalaTelemedicinaRepository,
    @Inject(SALA_EVENTO_REPOSITORY) private readonly eventos: SalaEventoRepository,
    @Inject(SINAL_SALA_REPOSITORY) private readonly sinais: SinalSalaRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async createSala(dto: CreateSalaDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, dto.clinicaId);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SALA_TTL_HORAS);

    const sala = await this.salas.create({
      clinicaId,
      agendamentoId: dto.agendamentoId,
      medicoId: context.user.sub,
      modalidade: dto.modalidade ?? ModalidadeAtendimento.MEDICO,
      pacienteId: dto.pacienteId,
      tokenMedico: randomUUID(),
      tokenPaciente: randomUUID(),
      expiresAt,
    });

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_CREATED, context, { clinicaId, salaId: sala.id, modalidade: sala.modalidade });
    return sala;
  }

  async findById(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const sala = await this.salas.findById(resolvedClinicaId, id);

    if (!sala) throw new NotFoundException('Sala de telemedicina nao encontrada.');
    return sala;
  }

  async findByAgendamento(agendamentoId: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const sala = await this.salas.findByAgendamento(resolvedClinicaId, agendamentoId);

    if (!sala) throw new NotFoundException('Sala nao encontrada para este agendamento.');
    return sala;
  }

  /** Histórico de salas da clínica (comprovação de atendimento) — data/paciente na tela. */
  async listar(query: ListSalasQueryDto, context: RequestAuditContext) {
    const clinicaId = this.resolveClinicaId(context.user, query.clinicaId);

    return this.salas.findAll(clinicaId, {
      dataInicio: query.dataInicio ? new Date(query.dataInicio) : undefined,
      dataFim: query.dataFim ? new Date(query.dataFim) : undefined,
    });
  }

  async joinSala(id: string, context: RequestAuditContext) {
    const sala = await this.salas.findByToken(id);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    if (sala.status === StatusSala.ENCERRADA || sala.status === StatusSala.EXPIRADA) {
      throw new ForbiddenException('Sala encerrada ou expirada.');
    }

    if (new Date() > sala.expiresAt) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EXPIRADA);
      throw new ForbiddenException('Sala expirada.');
    }

    const isMedico = context.user.sub === sala.medicoId && id === sala.tokenMedico;
    const isPaciente = context.user.sub === sala.pacienteId && id === sala.tokenPaciente;

    if (!isMedico && !isPaciente) {
      throw new ForbiddenException('Token nao corresponde ao usuario autenticado.');
    }

    if (sala.status === StatusSala.AGUARDANDO) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EM_ANDAMENTO, new Date());
    }

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_JOINED, context, {
      clinicaId: sala.clinicaId,
      salaId: sala.id,
      papel: isMedico ? 'medico' : 'paciente',
    });

    return { salaId: sala.id, papel: isMedico ? 'medico' : 'paciente' };
  }

  async encerrarSala(id: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);

    const sala = await this.salas.updateStatus(resolvedClinicaId, id, StatusSala.ENCERRADA, new Date());
    if (!sala) throw new NotFoundException('Sala nao encontrada.');

    await this.audit(AuditEvent.TELEMEDICINE_ROOM_ENDED, context, { clinicaId: resolvedClinicaId, salaId: id });
    return sala;
  }

  async listarEventos(salaId: string, clinicaId: string | undefined, context: RequestAuditContext) {
    const resolvedClinicaId = this.resolveClinicaId(context.user, clinicaId);
    const sala = await this.salas.findById(resolvedClinicaId, salaId);
    if (!sala) throw new NotFoundException('Sala nao encontrada.');

    return this.eventos.listBySala(resolvedClinicaId, salaId);
  }

  // ------- Acesso por token (página de atendimento; paciente entra sem login) -------
  // O token UUID entregue fora de banda É a credencial: identifica a sala e o papel.

  /** Consulta o estado da sala sem efeitos colaterais (funciona mesmo encerrada, para a tela final). */
  async acessarPorToken(token: string): Promise<SalaAcessoView> {
    const sala = await this.salas.findByToken(token);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    return this.toAcessoView(sala, this.papelDoToken(sala, token));
  }

  async entrarPorToken(token: string, meta: RequestMeta) {
    const { sala, papel } = await this.salaAtivaPorToken(token);

    if (sala.status === StatusSala.AGUARDANDO) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EM_ANDAMENTO, new Date());
    }

    await this.eventos.create({
      clinicaId: sala.clinicaId,
      salaId: sala.id,
      papel,
      tipo: TipoEventoSala.ENTROU,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.auditLogs.create({
      event: AuditEvent.TELEMEDICINE_ROOM_JOINED,
      userId: papel === PapelSala.PROFISSIONAL ? sala.medicoId : sala.pacienteId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { clinicaId: sala.clinicaId, salaId: sala.id, papel, via: 'token' },
    });

    return {
      salaId: sala.id,
      papel,
      iceServers: this.iceServers(),
    };
  }

  async enviarSinal(token: string, dto: EnviarSinalDto) {
    const { sala, papel } = await this.salaAtivaPorToken(token);
    await this.sinais.create({ salaId: sala.id, de: papel, tipo: dto.tipo, payload: dto.payload });
    return { ok: true };
  }

  async listarSinais(token: string, after?: string) {
    // Sala encerrada ainda ENTREGA sinais pendentes — o BYE do encerramento
    // precisa chegar ao outro participante; o status retornado permite ao
    // cliente finalizar a tela mesmo se o BYE se perder.
    const sala = await this.salas.findByToken(token);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    const papel = this.papelDoToken(sala, token);
    const sinais = await this.sinais.listPara(sala.id, papel, after);
    return { status: sala.status, sinais };
  }

  async registrarEventoPorToken(token: string, dto: RegistrarEventoDto, meta: RequestMeta) {
    // Sem checagem de sala ativa: eventos de saída/queda chegam legitimamente
    // depois do encerramento e fazem parte do registro do atendimento.
    const sala = await this.salas.findByToken(token);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    const papel = this.papelDoToken(sala, token);

    if (dto.tipo === TipoEventoSala.ENCERRADA) {
      if (papel !== PapelSala.PROFISSIONAL) {
        throw new ForbiddenException('Apenas o profissional encerra o atendimento.');
      }
      if (sala.status !== StatusSala.ENCERRADA) {
        await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.ENCERRADA, new Date());
        await this.sinais.create({ salaId: sala.id, de: papel, tipo: TipoSinal.BYE, payload: { motivo: 'encerrada' } });
        await this.auditLogs.create({
          event: AuditEvent.TELEMEDICINE_ROOM_ENDED,
          userId: sala.medicoId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          metadata: { clinicaId: sala.clinicaId, salaId: sala.id, via: 'token' },
        });
      }
    }

    const evento = await this.eventos.create({
      clinicaId: sala.clinicaId,
      salaId: sala.id,
      papel,
      tipo: dto.tipo,
      detalhes: dto.detalhes,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return evento;
  }

  private async salaAtivaPorToken(token: string): Promise<{ sala: SalaTelemedicina; papel: PapelSala }> {
    const sala = await this.salas.findByToken(token);
    if (!sala) throw new NotFoundException('Token de sala invalido.');

    if (sala.status === StatusSala.ENCERRADA || sala.status === StatusSala.EXPIRADA) {
      throw new ForbiddenException('Sala encerrada ou expirada.');
    }

    if (new Date() > sala.expiresAt) {
      await this.salas.updateStatus(sala.clinicaId, sala.id, StatusSala.EXPIRADA);
      throw new ForbiddenException('Sala expirada.');
    }

    return { sala, papel: this.papelDoToken(sala, token) };
  }

  private papelDoToken(sala: SalaTelemedicina, token: string): PapelSala {
    return token === sala.tokenMedico ? PapelSala.PROFISSIONAL : PapelSala.PACIENTE;
  }

  private toAcessoView(sala: SalaTelemedicina, papel: PapelSala): SalaAcessoView {
    return {
      salaId: sala.id,
      papel,
      status: sala.status,
      modalidade: sala.modalidade,
      expiresAt: sala.expiresAt,
      iniciadaEm: sala.iniciadaEm,
      encerradaEm: sala.encerradaEm,
    };
  }

  /**
   * STUN público resolve a maioria dos casos; TURN (relay para redes restritivas,
   * ex. 4G com CGNAT) entra por env sem mudança de código: TURN_URL,
   * TURN_USERNAME e TURN_CREDENTIAL.
   */
  private iceServers(): Array<{ urls: string | string[]; username?: string; credential?: string }> {
    const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const turnUrl = process.env.TURN_URL;
    if (turnUrl) {
      servers.push({
        urls: turnUrl.split(',').map((u) => u.trim()),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }

    return servers;
  }

  private resolveClinicaId(user: AuthTokenPayload, requestedClinicaId?: string): string {
    return resolveTenantClinicaId(user, requestedClinicaId);
  }

  private async audit(event: AuditEvent, context: RequestAuditContext, metadata: Record<string, unknown>) {
    await this.auditLogs.create({
      event,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata,
    });
  }
}
