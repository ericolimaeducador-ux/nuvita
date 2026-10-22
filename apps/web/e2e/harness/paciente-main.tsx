// Harness SOMENTE de teste: monta a PacienteDetailPage real (diálogos "Editar cadastro" e "Aplicar teste
// psicológico"). Vive fora de `src/` e do index.html da app; o build de produção nunca o enxerga.
// Sessão e API são simuladas pelo Playwright.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { PacienteDetailPage } from '@/pages/PacienteDetailPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/pacientes/p1']}>
          <Routes>
            <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
