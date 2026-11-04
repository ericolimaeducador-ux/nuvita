// Harness SOMENTE de teste: renderiza os componentes REAIS do documento clínico com
// dados fixos. Vive fora de `src/` e do index.html da app; o `vite build` de produção
// nunca o enxerga. Sessão (localStorage) e GET /clinicas/minha são simulados pelo Playwright.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { DocumentoAssinatura } from '@/components/DocumentoAssinatura';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <DocumentoClinicoLayout rotulo="Atestado de Comparecimento" onVoltar={() => undefined}>
            <p data-testid="corpo-clinico">
              Atesto para os devidos fins que <strong>Paciente Fictício</strong> compareceu a atendimento psicológico.
            </p>
            <DocumentoAssinatura />
          </DocumentoClinicoLayout>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
