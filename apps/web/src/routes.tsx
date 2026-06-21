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
import { MeusProcessosPage } from '@/pages/MeusProcessosPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { Papel } from '@/types';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/prontuarios" element={<ProntuariosPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/notificacoes" element={<NotificacoesPage />} />
          <Route element={<ProtectedRoute roles={[Papel.SECRETARIA, Papel.ADMIN]} />}>
            <Route path="/financeiro" element={<FinanceiroPage />} />
          </Route>
          <Route
            element={
              <ProtectedRoute
                roles={[Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADVOGADO, Papel.ADMIN]}
              />
            }
          >
            <Route path="/telemedicina" element={<TelemedicinaPage />} />
            <Route path="/fluxo-clinico" element={<FluxoClinicoPage />} />
            <Route path="/fluxo-clinico/:id" element={<FluxoPacientePage />} />
            <Route path="/fluxo-clinico/:id/laudo/:laudoId/imprimir" element={<LaudoImpressaoPage />} />
            <Route path="/fluxo-clinico/:id/avaliacao/:avaliacaoId/imprimir" element={<AvaliacaoImpressaoPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={[Papel.ADVOGADO, Papel.ADMIN]} />}>
            <Route path="/meus-processos" element={<MeusProcessosPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={[Papel.ADMIN]} />}>
            <Route path="/clinica" element={<ClinicaPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={[Papel.SUPER_ADMIN]} />}>
            <Route path="/super-admin" element={<SuperAdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
