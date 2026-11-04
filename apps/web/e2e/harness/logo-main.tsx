// Harness SOMENTE de teste: renderiza a ClinicaPage real (ADMIN) ou o cartão de logo do SUPER_ADMIN
// (?modo=super&clinica=<id>). Vive fora de `src/` e do index.html da app; o build de produção nunca o
// enxerga. Sessão e rotas da API/R2 são simuladas pelo Playwright.
import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AuthProvider } from '@/auth/AuthContext';
import { ClinicaPage } from '@/pages/ClinicaPage';

// import.meta.glob tolera o módulo ausente (útil no RED, antes de o cartão existir).
const cartoes = import.meta.glob('../../src/components/LogoClinicaCard.tsx');

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const params = new URLSearchParams(location.search);

async function main() {
  let conteudo = <ClinicaPage />;
  if (params.get('modo') === 'super') {
    const carregar = Object.values(cartoes)[0];
    if (carregar) {
      const { LogoClinicaCard } = (await carregar()) as { LogoClinicaCard: ComponentType<Record<string, unknown>> };
      conteudo = <LogoClinicaCard clinicaId={params.get('clinica') ?? ''} logoAtualDesconhecida />;
    } else {
      conteudo = <p>LogoClinicaCard ausente</p>;
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>{conteudo}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
void main();
