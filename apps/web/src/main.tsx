import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { AuthProvider } from '@/auth/AuthContext';
import { AppRoutes } from '@/routes';
import { Toaster } from '@/components/ui/toast';
import { criarQueryClient } from '@/lib/cache-sessao';
import './index.css';

dayjs.locale('pt-br');

// Cache separado por sessão (usuário + clínica) e limpo em login/logout/troca de clínica (R1.3).
const queryClient = criarQueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
