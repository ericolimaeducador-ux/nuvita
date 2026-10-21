// Harness SOMENTE de teste: monta a SuperAdminPage real (diálogo "Editar clínica"). Vive fora de
// `src/` e do index.html da app; o build de produção nunca o enxerga. Sessão e API são simuladas.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { SuperAdminPage } from '@/pages/SuperAdminPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <SuperAdminPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
