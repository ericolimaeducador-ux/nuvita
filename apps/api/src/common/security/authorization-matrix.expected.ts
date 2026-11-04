// RASCUNHO GERADO DO CÓDIGO ATUAL em 2026-11-03 — pendente de revisão humana; a matriz deve refletir o desenho desejado, não só o comportamento atual.
import { Papel } from '../../../../../packages/shared/src/auth';

/** A=ADMIN, M=MEDICO, E=ENFERMEIRO, P=PSICOLOGO, S=SECRETARIA, X=PACIENTE. SUPER_ADMIN é o dono da plataforma e sempre passa pelo RolesGuard. */
export type PapelSigla = 'A' | 'M' | 'E' | 'P' | 'S' | 'X';
export const SIGLA_PAPEL: Record<PapelSigla, Papel> = {
  A: Papel.ADMIN,
  M: Papel.MEDICO,
  E: Papel.ENFERMEIRO,
  P: Papel.PSICOLOGO,
  S: Papel.SECRETARIA,
  X: Papel.PACIENTE,
};

/**
 * Matriz de autorização (papel × endpoint). Valores: letras dos papéis permitidos (ex.: 'AMES'), ou
 *  - 'SUPER_ADMIN': só o super-admin;
 *  - 'PUBLICO': sem login (a credencial é outra: token da sala, PIN, assinatura do webhook...);
 *  - 'LOGADO': qualquer usuário autenticado, sem checagem de papel;
 *  - 'OIDC': chamada de serviço autenticada por OIDC (nenhuma rota atual).
 * SUPER_ADMIN passa em qualquer rota com RolesGuard e não precisa constar nas letras.
 * Rota nova sem linha aqui reprova o teste (negação por padrão).
 * Rotas marcadas 'ACHADO: revisar' estão listadas em docs/seguranca/ACHADOS-MATRIZ-2026-11-03.md.
 */
export const MATRIZ_API: Record<string, string> = {

  // AgendamentosController
  'POST /agendamentos': 'AMEPS',
  'GET /agendamentos': 'AMEPS',
  'GET /agendamentos/bloqueios': 'AMEPS',
  'POST /agendamentos/bloqueios': 'AMEP',
  'DELETE /agendamentos/bloqueios/:id': 'AMEP',
  'GET /agendamentos/:id': 'AMEPS',
  'PATCH /agendamentos/:id': 'AMEPS',
  'PATCH /agendamentos/:id/cancelar': 'ASX',
  'PATCH /agendamentos/:id/concluir': 'AMEPS',

  // AnalyticsController
  'GET /analytics/pacientes': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/agendamentos': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/financeiro': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/notificacoes': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/pacientes-por-cateter': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/pacientes-por-representante': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/entregas-no-mes': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/sondas-no-mes': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/aguardando-relatorio': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /analytics/pacientes-por-etapa': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa

  // AuthController
  'POST /auth/register': 'PUBLICO', // ACHADO: revisar — registro público (cria PACIENTE sem clínica); só habilitado se allowPublicRegistration
  'POST /auth/login': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/forgot-password': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/reset-password': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/forgot-login': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/forgot-login/verify': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/refresh': 'PUBLICO', // rota de autenticação (rate limit por IP)
  'POST /auth/logout': 'LOGADO',

  // AvaliacaoIUController
  'POST /avaliacao-iu': 'AMEP',
  'PATCH /avaliacao-iu/:id': 'AMEP',
  'PATCH /avaliacao-iu/:id/excluir': 'AMEP',
  'GET /avaliacao-iu/minhas': 'MEP',
  'GET /avaliacao-iu/count': 'AMEPS',
  'GET /avaliacao-iu': 'AMEPS',
  'GET /avaliacao-iu/:id': 'AMEPS',

  // CaptacaoController
  'POST /captacao': 'PUBLICO', // credencial = PIN do captador (CaptadorPinGuard)
  'GET /captacao': 'AMEPS',
  'POST /captacao/:id/exportar': 'AMEPS',

  // ChecklistDocumentosController
  'POST /checklist-documentos': 'AS',
  'GET /checklist-documentos': 'AMEPS',
  'GET /checklist-documentos/resumo-pendentes': 'AMEPS',
  'POST /checklist-documentos/padrao': 'AS',
  'PATCH /checklist-documentos/:id': 'AS',
  'DELETE /checklist-documentos/:id': 'AS',

  // ClinicasController
  'POST /clinicas/:clinicaId/usuarios': 'A',

  // DocumentosController
  'POST /documentos/presign-upload': 'AMES',
  'GET /documentos': 'AMES',
  'POST /documentos/:id/confirmar-upload': 'AMES',
  'GET /documentos/:id/access-url': 'AMES',
  'PATCH /documentos/:id/excluir': 'AMES',

  // EntregasController
  'POST /entregas': 'AMEPS',
  'GET /entregas': 'AMEPS',
  'GET /entregas/:id': 'AMEPS',
  'POST /entregas/:id/confirmar': 'AMEPS',

  // FinanceiroController
  'POST /financeiro/lancamentos': 'AS',
  'GET /financeiro/lancamentos': 'AS',
  'GET /financeiro/dashboard': 'AS',
  'GET /financeiro/lancamentos/:id': 'AS',
  'PATCH /financeiro/lancamentos/:id/receber': 'AS',
  'PATCH /financeiro/lancamentos/:id/cancelar': 'AS',

  // PsicologiaFinanceiroController
  'GET /financeiro/psicologia/painel': 'AP',
  'POST /financeiro/psicologia/configuracao': 'AP',
  'POST /financeiro/psicologia/cobrancas': 'AP',
  'PATCH /financeiro/psicologia/cobrancas/:id/receber': 'AP',
  'PATCH /financeiro/psicologia/cobrancas/:id/cancelar': 'AP',

  // FollowUpController
  'POST /followup': 'AMEP',
  'PATCH /followup/:id/excluir': 'AMEP',
  'GET /followup/resumo': 'AMEPS',
  'GET /followup': 'AMEPS',
  'GET /followup/avaliacao/:avaliacaoIuId': 'AMEPS',
  'GET /followup/:id': 'AMEPS',

  // HealthController
  'GET /health': 'PUBLICO', // health check

  // LaudoMedicoController
  'POST /laudo-medico': 'AMEP',
  'POST /laudo-medico/pre-preenchimento': 'AMEP',
  'GET /laudo-medico/pendentes-revisao': 'AM',
  'GET /laudo-medico': 'AMEPS',
  'GET /laudo-medico/:id': 'AMEPS',
  'PATCH /laudo-medico/:id': 'AMEP',
  'PATCH /laudo-medico/:id/excluir': 'AMEP',
  'POST /laudo-medico/:id/encaminhar': 'AMEP',
  'POST /laudo-medico/:id/assinar': 'AM',

  // MercadoPagoController
  'POST /pagamentos/preferencia': 'PUBLICO', // landing sem conta; rate limit / assinatura do webhook
  'POST /pagamentos/webhook': 'PUBLICO', // landing sem conta; rate limit / assinatura do webhook

  // NotificacoesController
  'POST /notificacoes': 'AS',
  'GET /notificacoes/dashboard': 'AS',
  'PATCH /notificacoes/preferencias/:pacienteId/opt-out': 'ASX',

  // ObservacoesPacienteController
  'POST /observacoes-paciente': 'AMEPS',
  'GET /observacoes-paciente': 'AMEPS',

  // PacientesController
  'POST /pacientes': 'AMEPS',
  'GET /pacientes': 'AMEPS',
  'GET /pacientes/representantes': 'AMEPS',
  'GET /pacientes/:id': 'AMEPS',
  'GET /pacientes/:id/export': 'AMS',
  'PATCH /pacientes/:id': 'AMEPS',
  'PATCH /pacientes/:id/observacoes': 'AMEPS',
  'PATCH /pacientes/:id/fluxo/avancar': 'AMEPS',
  'PATCH /pacientes/:id/desativar': 'AS',

  // ProdutosController
  'GET /produtos': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa
  'GET /produtos/:codigo': 'LOGADO', // ACHADO: revisar — sem RolesGuard/@Roles: qualquer usuário autenticado (inclusive PACIENTE) acessa

  // ProntuariosController
  'POST /prontuarios': 'MEP',
  'GET /prontuarios': 'MEP',
  'GET /prontuarios/cid10/autocomplete': 'MEP',
  'GET /prontuarios/:id': 'MEP',
  'PATCH /prontuarios/:id': 'MEP',
  'POST /prontuarios/:id/assinar': 'MEP',
  'POST /prontuarios/:id/addendums': 'MEP',
  'GET /prontuarios/:id/addendums': 'MEP',

  // SuperAdminController
  'GET /super-admin/clinicas': 'SUPER_ADMIN',
  'PATCH /super-admin/clinicas/:id': 'SUPER_ADMIN',
  'GET /super-admin/usuarios': 'SUPER_ADMIN',
  'GET /super-admin/usuarios/:id': 'SUPER_ADMIN',
  'POST /super-admin/usuarios': 'SUPER_ADMIN',
  'PATCH /super-admin/usuarios/:id': 'SUPER_ADMIN',
  'POST /super-admin/usuarios/:id/reset-password': 'SUPER_ADMIN',
  'POST /super-admin/usuarios/:id/reset-2fa': 'SUPER_ADMIN',

  // TelemedicinaAcessoController
  'GET /telemedicina/acesso/:token': 'PUBLICO', // credencial = token da sala na URL
  'POST /telemedicina/acesso/:token/entrar': 'PUBLICO', // credencial = token da sala na URL
  'POST /telemedicina/acesso/:token/sinais': 'PUBLICO', // credencial = token da sala na URL
  'GET /telemedicina/acesso/:token/sinais': 'PUBLICO', // credencial = token da sala na URL
  'POST /telemedicina/acesso/:token/eventos': 'PUBLICO', // credencial = token da sala na URL

  // TelemedicinaController
  'POST /telemedicina/salas': 'AMEP',
  'GET /telemedicina/salas': 'AMEP',
  'GET /telemedicina/salas/agendamento/:agendamentoId': 'AMEP',
  'GET /telemedicina/salas/:id': 'AMEPX',
  'POST /telemedicina/salas/:token/entrar': 'MEPX',
  'GET /telemedicina/salas/:id/eventos': 'AMEP',
  'PATCH /telemedicina/salas/:id/encerrar': 'AMEP',
};
