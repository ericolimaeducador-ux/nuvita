import { Papel } from '../../../../../packages/shared/src/auth';

/** A=ADMIN, P=PSICOLOGO, S=SECRETARIA, X=PACIENTE. SUPER_ADMIN é o dono da plataforma e sempre passa pelo RolesGuard. */
export type PapelSigla = 'A' | 'P' | 'S' | 'X';
export const SIGLA_PAPEL: Record<PapelSigla, Papel> = {
  A: Papel.ADMIN,
  P: Papel.PSICOLOGO,
  S: Papel.SECRETARIA,
  X: Papel.PACIENTE,
};

/**
 * Matriz ESPERADA (fonte da verdade do desenho, vinda de docs/levantamento-sistema/00-MAPA-COMPLETO.md e
 * das decisões do beta). Valores: letras dos papéis permitidos (ex.: 'APS'), ou
 *  - 'SUPER_ADMIN': só o super-admin;
 *  - 'PUBLICO': sem login (a credencial é outra: token da sala, OIDC do agendador...);
 *  - 'LOGADO': qualquer usuário autenticado (rotas da própria conta);
 *  - 'OIDC': chamada de serviço autenticada por OIDC, fora do fluxo de papéis.
 * PACIENTE (X) não aparece em nenhuma rota de dado: o produto não tem tela nem API para ele.
 * Rota nova sem linha aqui reprova o teste (negação por padrão).
 */
export const MATRIZ_API: Record<string, string> = {
  // agendamentos
  'GET /agendamentos': 'APS',
  'GET /agendamentos/:id': 'APS',
  'POST /agendamentos': 'APS',
  'PATCH /agendamentos/:id': 'APS',
  'PATCH /agendamentos/:id/concluir': 'APS',
  'PATCH /agendamentos/:id/cancelar': 'AS',
  'GET /agendamentos/bloqueios': 'APS',
  'POST /agendamentos/bloqueios': 'AP',
  'DELETE /agendamentos/bloqueios/:id': 'AP',

  // analytics (relatórios gerenciais): equipe da clínica; nunca o paciente
  'GET /analytics/pacientes': 'APS',
  'GET /analytics/agendamentos': 'APS',
  'GET /analytics/financeiro': 'APS',
  'GET /analytics/notificacoes': 'APS',
  'GET /analytics/pacientes-por-representante': 'APS',
  'GET /analytics/cobrancas-psicologia': 'APS',
  'GET /analytics/perda-seguimento': 'APS',
  'GET /analytics/horarios-vagos': 'APS',

  // auth
  'POST /auth/login': 'PUBLICO',
  'POST /auth/refresh': 'PUBLICO',
  'POST /auth/register': 'PUBLICO',
  'POST /auth/esqueci-senha': 'PUBLICO',
  'POST /auth/redefinir-senha': 'PUBLICO',
  'POST /auth/logout': 'LOGADO',
  'PATCH /auth/me': 'LOGADO',
  'POST /auth/aceitar-termos': 'LOGADO',
  'POST /auth/trocar-senha-obrigatoria': 'LOGADO',

  // clínica
  'GET /clinicas/minha': 'APS',
  'POST /clinicas/:clinicaId/logo/upload-url': 'A',
  'POST /clinicas/:clinicaId/logo/confirmar': 'A',
  'DELETE /clinicas/:clinicaId/logo': 'A',
  'POST /clinicas/:clinicaId/usuarios': 'A',

  // documentos emitidos pelo servidor (declaração: equipe; atestado clínico: só o psicólogo)
  'POST /documentos-emitidos/declaracao-comparecimento': 'APS',
  'POST /documentos-emitidos/atestado-comparecimento': 'P',

  // documentos (arquivos)
  'GET /documentos': 'APS',
  'POST /documentos/presign-upload': 'APS',
  'POST /documentos/:id/confirmar-upload': 'APS',
  'GET /documentos/:id/access-url': 'APS',
  'PATCH /documentos/:id/excluir': 'APS',

  // financeiro legado (sem tela): só a plataforma. O único financeiro do produto é o da psicologia
  'POST /financeiro/lancamentos': 'SUPER_ADMIN',
  'GET /financeiro/lancamentos': 'SUPER_ADMIN',
  'GET /financeiro/dashboard': 'SUPER_ADMIN',
  'GET /financeiro/lancamentos/:id': 'SUPER_ADMIN',
  'PATCH /financeiro/lancamentos/:id/receber': 'SUPER_ADMIN',
  'PATCH /financeiro/lancamentos/:id/cancelar': 'SUPER_ADMIN',
  // financeiro da psicologia: privativo do psicólogo
  'GET /financeiro/psicologia/painel': 'P',
  'POST /financeiro/psicologia/configuracao': 'P',
  'POST /financeiro/psicologia/cobrancas': 'P',
  'PATCH /financeiro/psicologia/cobrancas/:id/receber': 'P',
  'PATCH /financeiro/psicologia/cobrancas/:id/cancelar': 'P',

  'GET /health': 'PUBLICO',

  // IA clínica: só o psicólogo
  'POST /ia-clinica/sugerir-abordagem': 'P',
  'POST /ia-clinica/gerar-prescricao': 'P',
  'POST /ia-clinica/registros/:id/decisao': 'P',

  // inscrições do teste beta
  'POST /inscricoes-teste': 'PUBLICO',
  'GET /inscricoes-teste': 'SUPER_ADMIN',
  'PATCH /inscricoes-teste/:id/status': 'SUPER_ADMIN',

  'POST /internal/processar-lembretes': 'OIDC',

  // notificações
  'POST /notificacoes': 'AS',
  'GET /notificacoes/dashboard': 'AS',
  'PATCH /notificacoes/preferencias/:pacienteId/opt-out': 'AS',

  'GET /observacoes-paciente': 'APS',
  'POST /observacoes-paciente': 'APS',

  // pacientes
  'POST /pacientes': 'APS',
  'GET /pacientes': 'APS',
  'GET /pacientes/representantes': 'APS',
  'GET /pacientes/:id': 'APS',
  'PATCH /pacientes/:id': 'APS',
  'PATCH /pacientes/:id/observacoes': 'APS',
  'PATCH /pacientes/:id/desativar': 'AS',
  'GET /pacientes/:id/export': 'AP', // exportação LGPD: não é da secretária
  'PATCH /pacientes/:id/identidade': 'SUPER_ADMIN',

  // prontuários: dado clínico, só o psicólogo
  'POST /prontuarios': 'P',
  'GET /prontuarios': 'P',
  'GET /prontuarios/resumo-acompanhamento': 'P',
  'GET /prontuarios/cid10/autocomplete': 'P',
  'GET /prontuarios/:id': 'P',
  'PATCH /prontuarios/:id': 'P',
  'POST /prontuarios/:id/assinar': 'P',
  'POST /prontuarios/:id/addendums': 'P',
  'GET /prontuarios/:id/addendums': 'P',

  // super-admin (SuperAdminGuard)
  'GET /super-admin/clinicas': 'SUPER_ADMIN',
  'GET /super-admin/recuperacao-senha': 'SUPER_ADMIN',
  'POST /super-admin/clinicas': 'SUPER_ADMIN',
  'PATCH /super-admin/clinicas/:id': 'SUPER_ADMIN',
  'GET /super-admin/usuarios': 'SUPER_ADMIN',
  'GET /super-admin/usuarios/:id': 'SUPER_ADMIN',
  'POST /super-admin/usuarios': 'SUPER_ADMIN',
  'PATCH /super-admin/usuarios/:id': 'SUPER_ADMIN',
  'POST /super-admin/usuarios/:id/reset-password': 'SUPER_ADMIN',
  'POST /super-admin/usuarios/:id/reset-2fa': 'SUPER_ADMIN',

  // telemedicina (lado autenticado)
  'POST /telemedicina/salas': 'AP',
  'GET /telemedicina/salas': 'AP',
  'GET /telemedicina/salas/agendamento/:agendamentoId': 'AP',
  'GET /telemedicina/salas/:id': 'AP',
  'GET /telemedicina/salas/:id/eventos': 'AP',
  'PATCH /telemedicina/salas/:id/encerrar': 'AP',
  'POST /telemedicina/salas/:token/entrar': 'P',
  // telemedicina (lado do paciente: o token da sala é a credencial)
  'GET /telemedicina/acesso/:token': 'PUBLICO',
  'POST /telemedicina/acesso/:token/entrar': 'PUBLICO',
  'POST /telemedicina/acesso/:token/sinais': 'PUBLICO',
  'GET /telemedicina/acesso/:token/sinais': 'PUBLICO',
  'POST /telemedicina/acesso/:token/eventos': 'PUBLICO',

  'POST /testes-psicologicos': 'P',
  'GET /testes-psicologicos': 'P',

  // tickets de correção de identidade
  'POST /tickets': 'APS',
  'GET /tickets': 'SUPER_ADMIN',
  'GET /tickets/paciente/:pacienteId': 'APS',
  'POST /tickets/:id/atender': 'SUPER_ADMIN',
  'POST /tickets/:id/recusar': 'SUPER_ADMIN',
};
