// Harness SOMENTE de teste: monta as rotas REAIS do web (AppRoutes) para a matriz perfil × rota.
// A rota inicial vem do hash (#/pacientes/p1). Um sonda mostra o caminho final no DOM (fica FORA do
// ErrorBoundary, então aparece mesmo se a tela montada quebrar com a API simulada). Sessão e API: Playwright.
import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { AppRoutes } from '@/routes';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

class Contem extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false };
  static getDerivedStateFromError() { return { quebrou: true }; }
  render() { return this.state.quebrou ? <p>tela quebrou com a API simulada</p> : this.props.children; }
}

function Sonda() {
  const { pathname } = useLocation();
  return <div id="sonda" data-pathname={pathname} style={{ position: 'fixed', bottom: 0, right: 0, fontSize: 10 }}>{pathname}</div>;
}

const inicial = window.location.hash.replace(/^#/, '') || '/dashboard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[inicial]}>
          <Sonda />
          <Contem><AppRoutes /></Contem>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
