import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { AgendamentosService } from '../../agendamentos/application/agendamentos.service';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { ClinicasService } from '../../clinicas/application/clinicas.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { DOCUMENTO_EMITIDO_REPOSITORY } from '../documentos-emitidos.constants';
import { DocumentoEmitidoView, TipoDocumentoEmitido } from '../domain/documento-emitido.entity';
import { EmitirDocumentoDto } from './dto/emitir-documento.dto';
import { DocumentoEmitidoRepository } from './ports/documento-emitido.repository';

export interface EmissaoContext {
  ip: string;
  userAgent: string;
  user: AuthTokenPayload;
}

const ALFABETO_PROTOCOLO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * O SERVIDOR é a fonte do conteúdo dos documentos de comparecimento. A data e a hora vêm somente de um
 * atendimento CONCLUÍDO na agenda (nunca de campo digitável); a redação do texto fica aqui, testada num
 * lugar só; cada emissão é registrada (quem, quando, paciente, agendamento) com protocolo e auditoria.
 */
@Injectable()
export class DocumentosEmitidosService {
  constructor(
    @Inject(DOCUMENTO_EMITIDO_REPOSITORY) private readonly documentos: DocumentoEmitidoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly agendamentos: AgendamentosService,
    private readonly pacientes: PacientesService,
    private readonly clinicas: ClinicasService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /** Administrativa: afirma só a PRESENÇA na clínica, sem dizer que houve atendimento psicológico. */
  emitirDeclaracao(dto: EmitirDocumentoDto, context: EmissaoContext): Promise<DocumentoEmitidoView> {
    return this.emitir(TipoDocumentoEmitido.DECLARACAO_COMPARECIMENTO, 'Declaração de Comparecimento', dto, context, {
      corpo: (nome, a) =>
        `Declaro, para os devidos fins, que ${nome} esteve nesta clínica em ${a.data}, das ${a.horaInicio} às ${a.horaFim}.`,
    });
  }

  /** Clínica: privativa do psicólogo, assinada com nome e CRP. */
  async emitirAtestado(dto: EmitirDocumentoDto, context: EmissaoContext): Promise<DocumentoEmitidoView> {
    if (context.user.papel !== Papel.PSICOLOGO) {
      throw new ForbiddenException('Somente o psicologo emite o atestado de comparecimento.');
    }
    const profissional = await this.users.findById(context.user.sub);
    if (!profissional?.crp) {
      throw new UnprocessableEntityException('Informe o CRP no seu perfil para emitir documentos clinicos.');
    }
    return this.emitir(TipoDocumentoEmitido.ATESTADO_COMPARECIMENTO, 'Atestado de Comparecimento', dto, context, {
      crp: profissional.crp,
      corpo: (nome, a) =>
        `Atesto para os devidos fins que ${nome} compareceu a atendimento psicológico em ${a.data}, às ${a.horaInicio}.`,
    });
  }

  private async emitir(
    tipo: TipoDocumentoEmitido,
    titulo: string,
    dto: EmitirDocumentoDto,
    context: EmissaoContext,
    modelo: { crp?: string; corpo: (nome: string, atendimento: DocumentoEmitidoView['atendimento']) => string },
  ): Promise<DocumentoEmitidoView> {
    const clinicaId = resolveTenantClinicaId(context.user, undefined);

    // Posse e existência: 404 para o que não é da clínica; 403 para o psicólogo que não é dono do atendimento.
    const agendamento = await this.agendamentos.obterParaEmissao(clinicaId, dto.agendamentoId, context.user);
    if (agendamento.pacienteId !== dto.pacienteId) {
      throw new NotFoundException('Agendamento nao encontrado.');
    }
    const resumo = (await this.pacientes.resumoPorIds(clinicaId, [dto.pacienteId])).get(dto.pacienteId);
    if (!resumo) {
      throw new NotFoundException('Paciente nao encontrado.');
    }
    if (agendamento.status !== StatusAgendamento.CONCLUIDO) {
      throw new UnprocessableEntityException('Só é possível emitir para atendimento concluído na agenda.');
    }

    const clinica = await this.clinicas.contextoDeEmissao(clinicaId);
    const atendimento = this.formatarAtendimento(agendamento.dataHoraInicio, agendamento.dataHoraFim, clinica.fusoHorario);
    const emitidoEm = new Date();
    const protocolo = this.gerarProtocolo();

    const registro = await this.documentos.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      agendamentoId: dto.agendamentoId,
      tipo,
      emitidoPor: context.user.sub,
      emitidoEm,
      protocolo,
    });

    await this.auditLogs.create({
      event: AuditEvent.DOCUMENT_ISSUED,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId,
        documentoEmitidoId: registro.id,
        tipo,
        protocolo,
        pacienteId: dto.pacienteId,
        agendamentoId: dto.agendamentoId,
      },
    });

    return {
      id: registro.id,
      protocolo,
      tipo,
      titulo,
      corpo: modelo.corpo(resumo.nome, atendimento),
      atendimento,
      emissor: { nome: context.user.nome ?? context.user.email, ...(modelo.crp ? { crp: modelo.crp } : {}) },
      clinica: { nome: clinica.nome },
      emitidoEm: emitidoEm.toISOString(),
    };
  }

  /** Data e horas no FUSO DA CLÍNICA (não no do navegador de quem emite). */
  private formatarAtendimento(inicio: Date, fim: Date, fusoHorario: string): DocumentoEmitidoView['atendimento'] {
    const parte = (data: Date, opcoes: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario, ...opcoes }).format(data);
    const hora = (data: Date) => parte(data, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return {
      data: parte(inicio, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      horaInicio: hora(inicio),
      horaFim: hora(fim),
    };
  }

  private gerarProtocolo(): string {
    const bytes = randomBytes(10);
    const sufixo = Array.from(bytes, (b) => ALFABETO_PROTOCOLO[b % ALFABETO_PROTOCOLO.length]).join('');
    return `NV-${sufixo}`;
  }
}
