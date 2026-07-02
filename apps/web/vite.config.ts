import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Frontend Nuvita. Encaminha as rotas da API NestJS (porta 3000) preservando
// os mesmos paths — assim o cookie de refresh (httpOnly, path /auth) é mantido.
//
// Como algumas rotas do SPA (/pacientes, /prontuarios, ...) coincidem com as da
// API, o `bypass` distingue pelo header Accept: navegação do navegador (pede
// text/html) é servida pelo SPA; XHR/fetch do axios (JSON) vai para a API.
const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';
const apiProxy = {
  target: API_TARGET,
  changeOrigin: true,
  bypass(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
    const accept = String(req.headers.accept ?? '');
    if (accept.includes('text/html')) {
      return req.url; // deixa o Vite servir o index.html (rota do SPA)
    }
    return undefined; // segue para o proxy da API
  },
};

// Em produção (GitHub Pages) o site é servido em /<repo>/ — por padrão /nuvita/.
// Sobrescreva com VITE_BASE (ex.: '/' para domínio próprio). No dev fica em '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE ?? '/nuvita/') : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '^/(auth|clinicas|pacientes|agendamentos|prontuarios|documentos|notificacoes|financeiro|telemedicina|super-admin|analytics|avaliacao-iu|followup|laudo-medico|processo-juridico|produtos|entregas|health|anotacoes-juridicas|checklist-documentos)(?=$|[/?])':
        apiProxy,
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          radix: [
            '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs', '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
            '@radix-ui/react-popover', '@radix-ui/react-separator', '@radix-ui/react-slot',
            '@radix-ui/react-label', '@radix-ui/react-tooltip',
          ],
          motion: ['framer-motion'],
          query: ['@tanstack/react-query', 'axios', 'dayjs'],
        },
      },
    },
  },
}));
