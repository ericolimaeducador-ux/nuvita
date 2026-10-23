import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { GateChain, ROTA_ACEITAR_TERMOS, ROTA_DEFINIR_SENHA } from '@/auth/GateChain';
import { AppLayout } from '@/layout/AppLayout';
import { EsqueciSenhaPage } from '@/pages/EsqueciSenhaPage';
import { RedefinirSenhaPage } from '@/pages/RedefinirSenhaPage';
import { LoginPage } from '@/pages/LoginPage';
import { AceitarTermosPage } from '@/pages/AceitarTermosPage';
import { DefinirSenhaObrigatoriaPage } from '@/pages/DefinirSenhaObrigatoriaPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PacientesPage } from '@/pages/PacientesPage';
import { PacienteDetailPage } from '@/pages/PacienteDetailPage';
import { AgendaPage } from '@/pages/AgendaPage';
import { ProntuariosPage } from '@/pages/ProntuariosPage';
import { DocumentosPage } from '@/pages/DocumentosPage';
import { NotificacoesPage } from '@/pages/NotificacoesPage';
import { FinanceiroPsicologiaPage } from '@/pages/FinanceiroPsicologiaPage';
import { TelemedicinaPage } from '@/pages/TelemedicinaPage';
import { AtendimentoTelemedicinaPage } from '@/pages/AtendimentoTelemedicinaPage';
import { ClinicaPage } from '@/pages/ClinicaPage';
import { ProntuarioImpressaoPage } from '@/pages/ProntuarioImpressaoPage';
import { AtestadoComparecimentoPage } from '@/pages/AtestadoComparecimentoPage';
import { DeclaracaoComparecimentoPage } from '@/pages/DeclaracaoComparecimentoPage';
import { LaudoPsicoterapicoPage } from '@/pages/LaudoPsicoterapicoPage';
import { EncaminhamentoPage } from '@/pages/EncaminhamentoPage';
import { PrescricaoCuidadosPage } from '@/pages/PrescricaoCuidadosPage';
import { AtendimentoPsicologicoPage } from '@/pages/AtendimentoPsicologicoPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { RelatoriosGerenciaisPage } from '@/pages/RelatoriosGerenciaisPage';
import { Modulo, Papel } from '@/types';

// O acesso é controlado por MÓDULO (permissões efetivas do usuário, ajustáveis
// pelo super-admin). O papel só permanece como trava dura no /super-admin;
// nos demais, o padrão por papel já vem embutido em resolvePermissoes.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      {/* Sala de teleatendimento é PÚBLICA: o paciente entra pelo link com o
          token da sala, sem conta no sistema. O token UUID é a credencial. */}
      <Route path="/tele/:token" element={<AtendimentoTelemedicinaPage />} />
      <Route element={<ProtectedRoute />}>
        {/* Cadeia de gates pós-login: enquanto houver termos a aceitar ou
            senha temporária a trocar, só a tela do gate ativo é acessível. */}
        <Route element={<GateChain />}>
          <Route path={ROTA_ACEITAR_TERMOS} element={<AceitarTermosPage />} />
          <Route path={ROTA_DEFINIR_SENHA} element={<DefinirSenhaObrigatoriaPage />} />
          {/* Páginas de impressão FORA do AppLayout: o documento sai limpo
              (sem sidebar/header do site) tanto na tela quanto no print/PDF. */}
          {/* PRIVATIVO do psicólogo (documento clínico e prontuário). Esconder no menu nunca é a proteção:
              a rota exige o papel. Ver e2e/matriz-rotas.pw.ts. */}
          <Route element={<ProtectedRoute roles={[Papel.PSICOLOGO]} modulo={Modulo.PACIENTES} />}>
            <Route path="/pacientes/:id/prontuario/:prontuarioId/imprimir" element={<ProntuarioImpressaoPage />} />
            <Route path="/pacientes/:id/documentos/atestado" element={<AtestadoComparecimentoPage />} />
            <Route path="/pacientes/:id/documentos/laudo" element={<LaudoPsicoterapicoPage />} />
            <Route path="/pacientes/:id/documentos/encaminhamento" element={<EncaminhamentoPage />} />
            <Route path="/pacientes/:id/documentos/prescricao" element={<PrescricaoCuidadosPage />} />
          </Route>
          {/* Declaração de comparecimento: documento ADMINISTRATIVO (só presença), emitido pela secretária; data/hora vêm da agenda. */}
          <Route element={<ProtectedRoute roles={[Papel.SECRETARIA, Papel.ADMIN, Papel.PSICOLOGO]} modulo={Modulo.PACIENTES} />}>
            <Route path="/pacientes/:id/documentos/declaracao-comparecimento" element={<DeclaracaoComparecimentoPage />} />
          </Route>
          <Route element={<AppLayout />}>
            {/* /dashboard fica sem gate: é o destino dos redirects e todo papel o tem por padrão. */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route element={<ProtectedRoute modulo={Modulo.PACIENTES} />}>
              <Route path="/pacientes" element={<PacientesPage />} />
              <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.AGENDA} />}>
              <Route path="/agenda" element={<AgendaPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.PRONTUARIOS} />}>
              <Route path="/prontuarios" element={<ProntuariosPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.DOCUMENTOS} />}>
              <Route path="/documentos" element={<DocumentosPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.NOTIFICACOES} />}>
              <Route path="/notificacoes" element={<NotificacoesPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.TELEMEDICINA} />}>
              <Route path="/telemedicina" element={<TelemedicinaPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.ATENDIMENTO_PSICOLOGICO} />}>
              <Route path="/atendimento-psicologico" element={<AtendimentoPsicologicoPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.FINANCEIRO_PSICOLOGIA} />}>
              <Route path="/financeiro-psicologia" element={<FinanceiroPsicologiaPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.CLINICA} />}>
              <Route path="/clinica" element={<ClinicaPage />} />
            </Route>
            <Route element={<ProtectedRoute modulo={Modulo.ANALYTICS} />}>
              <Route path="/relatorios" element={<RelatoriosGerenciaisPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={[Papel.SUPER_ADMIN]} modulo={Modulo.SUPER_ADMIN} />}>
              <Route path="/super-admin" element={<SuperAdminPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
