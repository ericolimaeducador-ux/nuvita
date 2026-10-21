// Harness SOMENTE de teste: monta a PÁGINA real do atestado (AtestadoComparecimentoPage) numa rota,
// para pegar regressões do layout completo (timbre + corpo + assinatura + rodapé), e não só de um
// componente isolado. Sessão e API são simuladas pelo Playwright.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { AtestadoComparecimentoPage } from '@/pages/AtestadoComparecimentoPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/pacientes/p1/atestado']}>
          <Routes>
            <Route path="/pacientes/:id/atestado" element={<AtestadoComparecimentoPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
