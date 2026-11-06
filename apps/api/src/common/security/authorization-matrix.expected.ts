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

  // entregas de insumo (etapa 3): equipe da clínica; confirmar (pode concluir o fluxo clínico) só enfermeiro/admin
  'POST /entregas': 'AES',
  'GET /entregas': 'AES',
  'GET /entregas/:id': 'AES',
  'POST /entregas/:id/confirmar': 'AE',
  // checklist de documentos (etapa 3c): equipe da clínica; PACIENTE não tem acesso
  'POST /checklist-documentos': 'AES',
  'GET /checklist-documentos': 'AES',
  'GET /checklist-documentos/resumo-pendentes': 'AES',
  'POST /checklist-documentos/padrao': 'AES',
  'PATCH /checklist-documentos/:id': 'AES',
  'DELETE /checklist-documentos/:id': 'AES',
  // follow-up (etapa 3c): ler = equipe; decidir elegibilidade (criar/excluir) é clínico: só enfermeiro/admin
  'POST /followup': 'AE',
  'PATCH /followup/:id/excluir': 'AE',
  'GET /followup/resumo': 'AES',
  'GET /followup': 'AES',
  'GET /followup/avaliacao/:avaliacaoIuId': 'AES',
  'GET /followup/:id': 'AES',
  // avaliação de IU (etapa 4a): dado clínico — enfermeiro/admin escrevem, secretaria só lê; 'minhas' é só do enfermeiro
  'POST /avaliacao-iu': 'AE',
  'PATCH /avaliacao-iu/:id': 'AE',
  'PATCH /avaliacao-iu/:id/excluir': 'AE',
  'GET /avaliacao-iu/minhas': 'E',
  'GET /avaliacao-iu/count': 'AES',
  'GET /avaliacao-iu': 'AES',
  'GET /avaliacao-iu/:id': 'AES',
  // consulta de enfermagem (etapa 5a): conteúdo clínico só do ENFERMEIRO (ler: enfermeiros da clínica; escrever/assinar/
  // adendo: só o autor — regra no serviço). Diverge do prontuário do psi de propósito (cuidado de equipe). Gerar a
  // cobrança pendente: autor ou ADMIN (sem conteúdo clínico).
  'POST /consultas': 'E',
  'GET /consultas': 'E',
  'GET /consultas/:id': 'E',
  'PATCH /consultas/:id': 'E',
  'POST /consultas/:id/assinar': 'E',
  'POST /consultas/:id/cobranca': 'AE',
  'POST /consultas/:id/adendos': 'E',
  // etapa 5c: reaplicar o desfecho do módulo Ferida nas lesões (consulta assinada; idempotente; sem conteúdo clínico)
  'POST /consultas/:id/lesoes/aplicar-desfecho': 'E',
  // anexos da consulta (etapa 5b): conteúdo clínico — enviar/confirmar só o autor em rascunho, ler = quem lê a consulta (regra no serviço)
  'POST /consultas/:id/anexos/presign-upload': 'E',
  'POST /consultas/:id/anexos/:anexoId/confirmar-upload': 'E',
  'GET /consultas/:id/anexos': 'E',
  'GET /consultas/:id/anexos/:anexoId/access-url': 'E',
  // feridas (etapa 5c): lesões e consentimento de imagem — conteúdo clínico, só ENFERMEIRO da clínica (regra no serviço).
  // Sem rota de status (muda só pela assinatura da consulta) e sem exclusão.
  'POST /lesoes': 'E',
  'GET /lesoes': 'E',
  'GET /lesoes/historico': 'E',
  'GET /lesoes/:id': 'E',
  'PATCH /lesoes/:id': 'E',
  'GET /consentimentos-imagem': 'E',
  'POST /consentimentos-imagem': 'E',
  'POST /consentimentos-imagem/:id/revogar': 'E',
  // financeiro de paciente (etapa 4b): registro de cobranças + avisos (sem processar pagamento). Equipe da clínica;
  // o valor padrão da consulta (configuração) só o ADMIN altera. PACIENTE nunca.
  'POST /cobrancas': 'AES',
  'GET /cobrancas': 'AES',
  'GET /cobrancas/resumo': 'AES',
  'GET /cobrancas/configuracao': 'AES',
  'PUT /cobrancas/configuracao': 'A',
  'GET /cobrancas/:id': 'AES',
  'PATCH /cobrancas/:id': 'AES',
  'POST /cobrancas/:id/aviso': 'AES',
  'PATCH /cobrancas/:id/pagar': 'AES',
  'PATCH /cobrancas/:id/cancelar': 'AES',
  // captação (etapa 4a): POST é PÚBLICO (protegido por PIN no CaptadorPinGuard); gestão da fila = equipe da clínica
  'POST /captacao': 'PUBLICO',
  'GET /captacao': 'AES',
  'PATCH /captacao/:id': 'AES',
  'POST /captacao/:id/exportar': 'AES',

  // produtos: catálogo operacional global. Leitura da equipe; alteração só admin (SUPER_ADMIN sempre passa)
  'GET /produtos': 'AES',
  'GET /produtos/:codigo': 'AES',
  'POST /produtos': 'A',
  'PATCH /produtos/:codigo': 'A',
  'PATCH /produtos/:codigo/desativar': 'A',

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

  // tickets de correção de identidade
  'POST /tickets': 'AES',
  'GET /tickets': 'SUPER_ADMIN',
  'GET /tickets/paciente/:pacienteId': 'AES',
  'POST /tickets/:id/atender': 'SUPER_ADMIN',
  'POST /tickets/:id/recusar': 'SUPER_ADMIN',
};
