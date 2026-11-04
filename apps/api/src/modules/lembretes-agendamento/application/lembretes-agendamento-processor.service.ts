import { Inject, Injectable, Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AGENDAMENTO_REPOSITORY } from '../../agendamentos/agendamentos.constants';
import { Agendamento } from '../../agendamentos/domain/agendamento.entity';
import { calcularJanelaLembrete } from '../../agendamentos/domain/lembrete-window';
import { AgendamentoRepository } from '../../agendamentos/application/ports/agendamento.repository';
import { USER_REPOSITORY } from '../../auth/auth.constants';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { CreateNotificacaoDto } from '../../notificacoes/application/dto/create-notificacao.dto';
import { NotificacaoRequestContext, NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ProcessarLembretesResponseDto } from './dto/processar-lembretes-response.dto';

interface HorizonteLembrete {
  tipo: TipoNotificacao;
  campo: 'lembrete24hEnviadoEm' | 'lembrete1hEnviadoEm';
  horizonteHoras: number;
}

const HORIZONTES: readonly HorizonteLembrete[] = [
  { tipo: TipoNotificacao.LEMBRETE_CONSULTA_24H, campo: 'lembrete24hEnviadoEm', horizonteHoras: 24 },
  { tipo: TipoNotificacao.LEMBRETE_CONSULTA_1H, campo: 'lembrete1hEnviadoEm', horizonteHoras: 1 },
];

/**
 * feature-consultation-reminder-scheduler: lógica real de
 * POST /internal/processar-lembretes (chamada pelo controller, protegido
 * pelo OidcSchedulerGuardAdapter). Substitui o stub da fase 3.
 *
 * Para cada horizonte (24h / 1h): busca os agendamentos devidos
 * (listarParaLembrete, idempotência já embutida na query), dispara
 * NotificacoesService.create() pra cada um, e só marca o lembrete como
 * enviado DEPOIS do create() ter tido sucesso — nunca antes, e nunca se
 * create() falhar (senão o lembrete nunca mais seria tentado). Falha em
 * um agendamento não interrompe os demais (mesmo padrão de efeito
 * colateral não-crítico de notification_trigger_failed, já usado na
 * Categoria A).
 */
@Injectable()
export class LembretesAgendamentoProcessorService {
  private readonly logger = new Logger(LembretesAgendamentoProcessorService.name);

  constructor(
    @Inject(AGENDAMENTO_REPOSITORY) private readonly agendamentos: AgendamentoRepository,
    private readonly pacientesService: PacientesService,
    private readonly notificacoesService: NotificacoesService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async processar(): Promise<ProcessarLembretesResponseDto> {
    const agora = new Date();
    const resultado: ProcessarLembretesResponseDto = { attempted: 0, sent: 0, deduped: 0, failed: 0 };

    for (const horizonte of HORIZONTES) {
      const janela = calcularJanelaLembrete(agora, horizonte.horizonteHoras);
      const devidos = await this.agendamentos.listarParaLembrete(horizonte.campo, janela);

      for (const agendamento of devidos) {
        resultado.attempted++;
        await this.processarUm(agendamento, horizonte, resultado);
      }
    }

    this.logger.log(JSON.stringify({ event: 'reminder_run_summary', ...resultado }));

    return resultado;
  }

  private async processarUm(
    agendamento: Agendamento,
    horizonte: HorizonteLembrete,
    resultado: ProcessarLembretesResponseDto,
  ): Promise<void> {
    try {
      const paciente = (
        await this.pacientesService.resumoPorIds(agendamento.clinicaId, [agendamento.pacienteId])
      ).get(agendamento.pacienteId);
      if (!paciente?.email) {
        throw new Error('Paciente sem e-mail cadastrado.');
      }

      const nomeMedico = await this.resolverNomeMedico(agendamento.medicoId);

      await this.notificacoesService.create(
        {
          clinicaId: agendamento.clinicaId,
          destinatarioId: agendamento.pacienteId,
          tipo: horizonte.tipo,
          canal: CanalNotificacao.EMAIL,
          email: paciente.email,
          nome: paciente.nomeDestinatario,
          nomePaciente: paciente.nome,
          paraResponsavel: paciente.ehResponsavel,
          medico: nomeMedico,
          hora: this.formatarDataHora(agendamento.dataHoraInicio),
        } as CreateNotificacaoDto,
        this.contextoSistema(agendamento.clinicaId),
      );

      // Idempotência marcada SÓ depois do envio ter dado certo — nunca antes,
      // e nunca se create() lançar (esse caminho não chega aqui).
      const marcou = await this.agendamentos.marcarLembreteEnviado(
        agendamento.clinicaId,
        agendamento.id,
        horizonte.campo,
        new Date(),
      );

      if (marcou) {
        resultado.sent++;
      } else {
        resultado.deduped++;
        this.logColisaoIdempotencia(horizonte.tipo, agendamento.clinicaId, agendamento.id);
      }
    } catch (error) {
      resultado.failed++;
      this.logFalhaLembrete(horizonte.tipo, agendamento.clinicaId, agendamento.id, error);
    }
  }

  /**
   * Contexto sintético de sistema — não há usuário logado (job periódico via
   * Cloud Scheduler). Papel enum não tem valor de "sistema"
   * (infra/PENDENCIAS.md #15): usa SUPER_ADMIN com sub/email não-humanos +
   * automatedActor=true, que NotificacoesService estampa em
   * metadata.automatedActor nos audit logs.
   */
  private contextoSistema(clinicaId: string): NotificacaoRequestContext {
    return {
      ip: 'internal',
      userAgent: 'consultation-reminder-scheduler',
      automatedActor: true,
      user: {
        sub: 'system:consultation-reminder-scheduler',
        email: 'system+consultation-reminder-scheduler@nuvita.internal',
        papel: Papel.SUPER_ADMIN,
        clinicaId,
        jti: 'system',
        typ: 'access',
      },
    };
  }

  /** Mesmo tratamento de efeito colateral de resolverNomeMedico() em agendamentos.service.ts. */
  private async resolverNomeMedico(medicoId: string): Promise<string | undefined> {
    try {
      const medico = await this.users.findById(medicoId);
      return medico?.nome;
    } catch {
      return undefined;
    }
  }

  private formatarDataHora(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(data);
  }

  private logColisaoIdempotencia(tipo: TipoNotificacao, clinicaId: string, agendamentoId: string): void {
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Colisao de idempotencia ao marcar lembrete enviado; outra execucao marcou primeiro.',
        event: 'reminder_idempotency_collision',
        tipo,
        clinicaId,
        agendamentoId,
      }),
    );
  }

  private logFalhaLembrete(tipo: TipoNotificacao, clinicaId: string, agendamentoId: string, error: unknown): void {
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Falha ao processar lembrete de consulta; campo NAO marcado, sera tentado na proxima execucao.',
        event: 'notification_trigger_failed',
        tipo,
        clinicaId,
        agendamentoId,
        erro: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
