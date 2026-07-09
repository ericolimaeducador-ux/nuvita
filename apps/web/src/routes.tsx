import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PacientesPage } from '@/pages/PacientesPage';
import { PacienteDetailPage } from '@/pages/PacienteDetailPage';
import { AgendaPage } from '@/pages/AgendaPage';
import { ProntuariosPage } from '@/pages/ProntuariosPage';
import { DocumentosPage } from '@/pages/DocumentosPage';
import { NotificacoesPage } from '@/pages/NotificacoesPage';
import { FinanceiroPage } from '@/pages/FinanceiroPage';
import { TelemedicinaPage } from '@/pages/TelemedicinaPage';
import { ClinicaPage } from '@/pages/ClinicaPage';
import { FluxoClinicoPage } from '@/pages/FluxoClinicoPage';
import { FluxoPacientePage } from '@/pages/FluxoPacientePage';
import { LaudoImpressaoPage } from '@/pages/LaudoImpressaoPage';
import { AvaliacaoImpressaoPage } from '@/pages/AvaliacaoImpressaoPage';
import { NatjusImpressaoPage } from '@/pages/NatjusImpressaoPage';
import { ProntuarioImpressaoPage } from '@/pages/ProntuarioImpressaoPage';
import { MeusProcessosPage } from '@/pages/MeusProcessosPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { Modulo, Papel } from '@/types';

// O acesso é controlado por MÓDULO (permissões efetivas do usuário, ajustáveis
// pelo super-admin). O papel só permanece como trava dura no /super-admin;
// nos demais, o padrão por papel já vem embutido em resolvePermissoes.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        {/* Páginas de impressão FORA do AppLayout: o documento sai limpo
            (sem sidebar/header do site) tanto na tela quanto no print/PDF. */}
        <Route element={<ProtectedRoute modulo={Modulo.PACIENTES} />}>
          <Route path="/pacientes/:id/prontuario/:prontuarioId/natjus/imprimir" element={<NatjusImpressaoPage />} />
          <Route path="/pacientes/:id/prontuario/:prontuarioId/imprimir" element={<ProntuarioImpressaoPage />} />
        </Route>
        <Route element={<ProtectedRoute modulo={Modulo.FLUXO_CLINICO} />}>
          <Route path="/fluxo-clinico/:id/laudo/:laudoId/imprimir" element={<LaudoImpressaoPage />} />
          <Route path="/fluxo-clinico/:id/avaliacao/:avaliacaoId/imprimir" element={<AvaliacaoImpressaoPage />} />
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
          <Route element={<ProtectedRoute modulo={Modulo.FINANCEIRO} />}>
            <Route path="/financeiro" element={<FinanceiroPage />} />
          </Route>
          <Route element={<ProtectedRoute modulo={Modulo.TELEMEDICINA} />}>
            <Route path="/telemedicina" element={<TelemedicinaPage />} />
          </Route>
          <Route element={<ProtectedRoute modulo={Modulo.FLUXO_CLINICO} />}>
            <Route path="/fluxo-clinico" element={<FluxoClinicoPage />} />
            <Route path="/fluxo-clinico/:id" element={<FluxoPacientePage />} />
          </Route>
          <Route element={<ProtectedRoute modulo={Modulo.PROCESSOS} />}>
            <Route path="/meus-processos" element={<MeusProcessosPage />} />
          </Route>
          <Route element={<ProtectedRoute modulo={Modulo.CLINICA} />}>
            <Route path="/clinica" element={<ClinicaPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={[Papel.SUPER_ADMIN]} modulo={Modulo.SUPER_ADMIN} />}>
            <Route path="/super-admin" element={<SuperAdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
