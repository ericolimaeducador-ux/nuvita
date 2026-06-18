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
import { ClinicaPage } from '@/pages/ClinicaPage';
import { Papel } from '@/types';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/prontuarios" element={<ProntuariosPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/notificacoes" element={<NotificacoesPage />} />
          <Route element={<ProtectedRoute roles={[Papel.ADMIN]} />}>
            <Route path="/clinica" element={<ClinicaPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
