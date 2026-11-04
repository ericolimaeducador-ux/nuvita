import { Papel } from '../../../../../packages/shared/src/auth';

/** A=ADMIN, E=ENFERMEIRO, S=SECRETARIA, X=PACIENTE. SUPER_ADMIN é o dono da plataforma e sempre passa pelo RolesGuard. */
export type PapelSigla = 'A' | 'E' | 'S' | 'X';
export const SIGLA_PAPEL: Record<PapelSigla, Papel> = {
  A: Papel.ADMIN,
  E: Papel.ENFERMEIRO,
  S: Papel.SECRETARIA,
  X: Papel.PACIENTE,
};

/**
 * Matriz ESPERADA (fonte da verdade do desenho, vinda de docs/levantamento-sistema/00-MAPA-COMPLETO.md e
 * das decisões do beta). Valores: letras dos papéis permitidos (ex.: 'AES'), ou
 *  - 'SUPER_ADMIN': só o super-admin;
 *  - 'PUBLICO': sem login (a credencial é outra: token da sala, OIDC do agendador...);
 *  - 'LOGADO': qualquer usuário autenticado (rotas da própria conta);
 *  - 'OIDC': chamada de serviço autenticada por OIDC, fora do fluxo de papéis.
 * PACIENTE (X) não aparece em nenhuma rota de dado: o produto não tem tela nem API para ele.
 * Rota nova sem linha aqui reprova o teste (negação por padrão).
 */
export const MATRIZ_API: Record<string, string> = {
  // agendamentos
  'GET /agendamentos': 'AES',
  'GET /agendamentos/:id': 'AES',
  'POST /agendamentos': 'AES',
  'PATCH /agendamentos/:id': 'AES',
  'PATCH /agendamentos/:id/concluir': 'AES',
  'PATCH /agendamentos/:id/cancelar': 'AES',
  'GET /agendamentos/bloqueios': 'AES',
  'POST /agendamentos/bloqueios': 'AE',
  'DELETE /agendamentos/bloqueios/:id': 'AE',

  // analytics (relatórios gerenciais): equipe da clínica; nunca o paciente
  'GET /analytics/pacientes': 'AES',
  'GET /analytics/agendamentos': 'AES',
  'GET /analytics/financeiro': 'AES',
  'GET /analytics/notificacoes': 'AES',
  'GET /analytics/pacientes-por-representante': 'AES',
  'GET /analytics/cobrancas-psicologia': 'AES',
  'GET /analytics/perda-seguimento': 'AES',
  'GET /analytics/horarios-vagos': 'AES',

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
  'GET /clinicas/minha': 'AES',
  'PATCH /clinicas/minha/documento': 'E',
  'POST /clinicas/:clinicaId/logo/upload-url': 'A',
  'POST /clinicas/:clinicaId/logo/confirmar': 'A',
  'DELETE /clinicas/:clinicaId/logo': 'A',
  'POST /clinicas/:clinicaId/usuarios': 'A',

  // documentos emitidos pelo servidor (declaração: equipe; atestado clínico: só o enfermeiro)
  'POST /documentos-emitidos/declaracao-comparecimento': 'AES',
  'POST /documentos-emitidos/atestado-comparecimento': 'E',

  // documentos (arquivos)
  'GET /documentos': 'AES',
  'POST /documentos/presign-upload': 'AES',
  'POST /documentos/:id/confirmar-upload': 'AES',
  'GET /documentos/:id/access-url': 'AES',
  'PATCH /documentos/:id/excluir': 'AES',

  // financeiro legado (sem tela): só a plataforma. O único financeiro do produto é o da psicologia
  'POST /financeiro/lancamentos': 'SUPER_ADMIN',
  'GET /financeiro/lancamentos': 'SUPER_ADMIN',
  'GET /financeiro/dashboard': 'SUPER_ADMIN',
  'GET /financeiro/lancamentos/:id': 'SUPER_ADMIN',
  'PATCH /financeiro/lancamentos/:id/receber': 'SUPER_ADMIN',
  'PATCH /financeiro/lancamentos/:id/cancelar': 'SUPER_ADMIN',
  // financeiro da psicologia: privativo do enfermeiro
  'GET /financeiro/psicologia/painel': 'E',
  'POST /financeiro/psicologia/configuracao': 'E',
  'POST /financeiro/psicologia/cobrancas': 'E',
  'PATCH /financeiro/psicologia/cobrancas/:id/receber': 'E',
  'PATCH /financeiro/psicologia/cobrancas/:id/cancelar': 'E',

  'GET /health': 'PUBLICO',

  // IA clínica: só o enfermeiro
  'POST /ia-clinica/sugerir-abordagem': 'E',
  'POST /ia-clinica/gerar-prescricao': 'E',
  'POST /ia-clinica/registros/:id/decisao': 'E',

  // inscrições do teste beta
  'POST /inscricoes-teste': 'PUBLICO',
  'GET /inscricoes-teste': 'SUPER_ADMIN',
  'PATCH /inscricoes-teste/:id/status': 'SUPER_ADMIN',

  'POST /internal/processar-lembretes': 'OIDC',

  // notificações
  'POST /notificacoes': 'AS',
  'GET /notificacoes/dashboard': 'AS',
  'PATCH /notificacoes/preferencias/:pacienteId/opt-out': 'AS',

  'GET /observacoes-paciente': 'AES',
  'POST /observacoes-paciente': 'AES',

  // pacientes
  'POST /pacientes': 'AES',
  'GET /pacientes': 'AES',
  'GET /pacientes/representantes': 'AES',
  'GET /pacientes/:id': 'AES',
  'PATCH /pacientes/:id': 'AES',
  'PATCH /pacientes/:id/observacoes': 'AES',
  'PATCH /pacientes/:id/fluxo/avancar': 'AES',
  'PATCH /pacientes/:id/desativar': 'AS',
  'GET /pacientes/:id/export': 'AE', // exportação LGPD: não é da secretária
  'PATCH /pacientes/:id/identidade': 'SUPER_ADMIN',

  // prontuários: dado clínico, só o enfermeiro
  'POST /prontuarios': 'E',
  'GET /prontuarios': 'E',
  'GET /prontuarios/resumo-acompanhamento': 'E',
  'GET /prontuarios/cid10/autocomplete': 'E',
  'GET /prontuarios/:id': 'E',
  'PATCH /prontuarios/:id': 'E',
  'POST /prontuarios/:id/assinar': 'E',
  'POST /prontuarios/:id/addendums': 'E',
  'GET /prontuarios/:id/addendums': 'E',

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
  'POST /telemedicina/salas': 'AE',
  'GET /telemedicina/salas': 'AE',
  'GET /telemedicina/salas/agendamento/:agendamentoId': 'AE',
  'GET /telemedicina/salas/:id': 'AE',
  'GET /telemedicina/salas/:id/eventos': 'AE',
  'PATCH /telemedicina/salas/:id/encerrar': 'AE',
  'POST /telemedicina/salas/:token/entrar': 'E',
  // telemedicina (lado do paciente: o token da sala é a credencial)
  'GET /telemedicina/acesso/:token': 'PUBLICO',
  'POST /telemedicina/acesso/:token/entrar': 'PUBLICO',
  'POST /telemedicina/acesso/:token/sinais': 'PUBLICO',
  'GET /telemedicina/acesso/:token/sinais': 'PUBLICO',
  'POST /telemedicina/acesso/:token/eventos': 'PUBLICO',

  'POST /testes-psicologicos': 'E',
  'GET /testes-psicologicos': 'E',

  // tickets de correção de identidade
  'POST /tickets': 'AES',
  'GET /tickets': 'SUPER_ADMIN',
  'GET /tickets/paciente/:pacienteId': 'AES',
  'POST /tickets/:id/atender': 'SUPER_ADMIN',
  'POST /tickets/:id/recusar': 'SUPER_ADMIN',
};
