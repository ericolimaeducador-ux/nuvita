import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { Ticket, TicketStatus, TicketTipo } from '../domain/ticket.entity';
import { TICKET_REPOSITORY } from '../tickets.constants';
import { AtenderTicketDto } from './dto/atender-ticket.dto';
import { CriarTicketDto } from './dto/criar-ticket.dto';
import { RecusarTicketDto } from './dto/recusar-ticket.dto';
import { TicketRepository } from './ports/ticket.repository';

export class TicketRequestContext {
  ip!: string;
  userAgent!: string;
  user!: AuthTokenPayload;
}

const PAPEIS_QUE_ABREM: readonly Papel[] = [Papel.PSICOLOGO, Papel.SECRETARIA, Papel.ADMIN];

/**
 * Tickets internos usuário → SUPER_ADMIN (feature-tickets-superadmin). Escopo
 * restrito: hoje só "Correção de dados de identidade" de um paciente.
 *
 * A auditoria leva só ids: a justificativa e o motivo de recusa podem conter
 * dado do paciente e ficam apenas no registro do ticket, criptografado.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @Inject(TICKET_REPOSITORY) private readonly tickets: TicketRepository,
    private readonly pacientes: PacientesService,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async abrir(dto: CriarTicketDto, clinicaId: string | undefined, context: TicketRequestContext): Promise<Ticket> {
    if (!PAPEIS_QUE_ABREM.includes(context.user.papel)) {
      throw new ForbiddenException('Seu perfil não pode abrir tickets de correção.');
    }

    const pacienteId = dto.pacienteId?.trim();
    const justificativa = dto.justificativa?.trim();
    if (!pacienteId) throw new BadRequestException('Informe o paciente do ticket.');
    if (!justificativa) throw new BadRequestException('A justificativa do ticket é obrigatória.');

    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    const encontrados = await this.pacientes.resumoPorIds(resolvedClinicaId, [pacienteId]);
    if (!encontrados.has(pacienteId)) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    // Status, tipo, autor e data são SEMPRE do servidor: nada disso é lido do corpo.
    const ticket = await this.tickets.criar({
      clinicaId: resolvedClinicaId,
      pacienteId,
      tipo: TicketTipo.CORRECAO_IDENTIDADE,
      justificativa,
      autorId: context.user.sub,
      status: TicketStatus.ABERTO,
      abertoEm: new Date(),
    });

    await this.audit(AuditEvent.TICKET_OPENED, context, {
      clinicaId: resolvedClinicaId,
      ticketId: ticket.id,
      pacienteId,
    });

    return ticket;
  }

  async listarAbertos(clinicaId: string | undefined, context: TicketRequestContext): Promise<Ticket[]> {
    this.assertSuperAdmin(context);
    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    return this.tickets.listar({ clinicaId: resolvedClinicaId, status: TicketStatus.ABERTO });
  }

  /** Tickets de um paciente da própria clínica — quem abriu vê aqui que a correção foi atendida. */
  async listarPorPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    context: TicketRequestContext,
  ): Promise<Ticket[]> {
    if (!PAPEIS_QUE_ABREM.includes(context.user.papel) && context.user.papel !== Papel.SUPER_ADMIN) {
      throw new ForbiddenException('Seu perfil não pode consultar tickets.');
    }
    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    return this.tickets.listar({ clinicaId: resolvedClinicaId, pacienteId });
  }

  /**
   * Atende o ticket: executa a correção de identidade (com a justificativa do
   * ticket) e só então o fecha. A posse do ticket é tomada ANTES da correção,
   * de forma atômica — se outro SUPER_ADMIN já pegou, 409 sem tocar no paciente.
   */
  async atender(
    ticketId: string,
    dto: AtenderTicketDto,
    clinicaId: string | undefined,
    context: TicketRequestContext,
  ): Promise<Ticket> {
    this.assertSuperAdmin(context);
    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    const ticket = await this.buscarAberto(resolvedClinicaId, ticketId);

    const posse = await this.tickets.reservar(resolvedClinicaId, ticketId, context.user.sub, new Date());
    if (!posse) {
      throw new ConflictException('Este ticket já foi resolvido ou está sendo atendido por outro usuário.');
    }

    try {
      await this.pacientes.corrigirIdentidade(
        ticket.pacienteId,
        {
          nome: dto.nome,
          cpf: dto.cpf,
          dataNascimento: dto.dataNascimento,
          justificativa: ticket.justificativa,
          ticketId: ticket.id,
          solicitanteUserId: ticket.autorId,
        },
        resolvedClinicaId,
        context,
      );
    } catch (erro) {
      // A correção falhou (CPF duplicado, validação...): devolve a posse e o ticket segue ABERTO.
      await this.tickets.liberar(resolvedClinicaId, ticketId, context.user.sub);
      throw erro;
    }

    const resolvido = await this.tickets.resolver(resolvedClinicaId, ticketId, {
      status: TicketStatus.ATENDIDO,
      resolvidoPor: context.user.sub,
      resolvidoEm: new Date(),
      exigeReservaDe: context.user.sub,
    });
    if (!resolvido) {
      // Só ocorre se a reserva venceu no meio e outro assumiu: a correção JÁ foi aplicada,
      // então isso precisa aparecer para investigação.
      this.logger.error(
        JSON.stringify({ level: 'error', event: 'ticket_fechamento_perdido', ticketId, userId: context.user.sub }),
      );
      throw new ConflictException('A correção foi aplicada, mas o ticket já havia sido fechado por outro usuário.');
    }

    await this.audit(AuditEvent.TICKET_ATTENDED, context, {
      clinicaId: resolvedClinicaId,
      ticketId,
      pacienteId: ticket.pacienteId,
    });

    return resolvido;
  }

  async recusar(
    ticketId: string,
    dto: RecusarTicketDto,
    clinicaId: string | undefined,
    context: TicketRequestContext,
  ): Promise<Ticket> {
    this.assertSuperAdmin(context);
    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException('O motivo da recusa é obrigatório.');

    const resolvedClinicaId = resolveTenantClinicaId(context.user, clinicaId);
    const ticket = await this.buscarAberto(resolvedClinicaId, ticketId);

    // Transição atômica: só vale se o ticket ainda estiver ABERTO.
    const resolvido = await this.tickets.resolver(resolvedClinicaId, ticketId, {
      status: TicketStatus.RECUSADO,
      resolvidoPor: context.user.sub,
      resolvidoEm: new Date(),
      motivoRecusa: motivo,
    });
    if (!resolvido) {
      throw new ConflictException('Este ticket já foi resolvido ou está sendo atendido por outro usuário.');
    }

    await this.audit(AuditEvent.TICKET_REFUSED, context, {
      clinicaId: resolvedClinicaId,
      ticketId,
      pacienteId: ticket.pacienteId,
    });

    return resolvido;
  }

  private assertSuperAdmin(context: TicketRequestContext): void {
    if (context.user.papel !== Papel.SUPER_ADMIN) {
      throw new ForbiddenException('Somente o SUPER_ADMIN pode executar esta ação.');
    }
  }

  private async buscarAberto(clinicaId: string, ticketId: string): Promise<Ticket> {
    const ticket = await this.tickets.buscarPorId(clinicaId, ticketId);
    if (!ticket) throw new NotFoundException('Ticket nao encontrado.');
    if (ticket.status !== TicketStatus.ABERTO) {
      throw new ConflictException('Este ticket já foi resolvido.');
    }
    return ticket;
  }

  private async audit(event: AuditEvent, context: TicketRequestContext, metadata: Record<string, unknown>): Promise<void> {
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
