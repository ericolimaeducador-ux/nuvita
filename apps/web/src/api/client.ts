import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { toast } from '@/components/ui/use-toast';

// A API NestJS sobe sem prefixo global e define o cookie de refresh no path
// /auth. Por isso servimos a API nos mesmos paths da origem (sem prefixo /api):
// em dev o proxy do Vite encaminha /auth, /pacientes, ... para :3000; em prod
// o nginx faz o mesmo. Assim o cookie (path /auth) é enviado em /auth/refresh.
// Para apontar para um host externo, defina VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = 'nuvita.accessToken';
const CLINICA_ATIVA_KEY = 'nuvita.clinicaAtiva';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Clínica que o SUPER_ADMIN está operando (papel de plataforma, sem clínica
 * própria no token). Vai em toda requisição como x-clinica-id; o backend só
 * a aceita para SUPER_ADMIN (TenantRequiredGuard) — para os demais papéis o
 * header é inofensivo, o tenant do token continua mandando.
 */
export function getClinicaAtiva(): string | null {
  return localStorage.getItem(CLINICA_ATIVA_KEY);
}
export function setClinicaAtiva(clinicaId: string | null): void {
  if (clinicaId) localStorage.setItem(CLINICA_ATIVA_KEY, clinicaId);
  else localStorage.removeItem(CLINICA_ATIVA_KEY);
}

export const api = axios.create({
  baseURL,
  withCredentials: true, // refresh token é cookie httpOnly em /auth
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const clinicaAtiva = getClinicaAtiva();
  if (clinicaAtiva) {
    config.headers.set('x-clinica-id', clinicaAtiva);
  }
  return config;
});

// 403 nunca pode virar tela vazia silenciosa: avisa o usuário que o acesso
// foi negado. Throttle de alguns segundos porque um dashboard dispara várias
// chamadas em paralelo e todas falham juntas — um toast basta.
let ultimoToast403 = 0;
function avisar403(error: AxiosError) {
  const agora = Date.now();
  if (agora - ultimoToast403 < 5000) return;
  ultimoToast403 = agora;
  const msg = apiErrorMessage(error, 'Você não tem permissão para acessar este recurso.');
  toast.error('Acesso negado', msg);
}

// Refresh transparente em 401 (uma tentativa, com fila para chamadas paralelas).
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const resp = await axios.post(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = resp.data?.accessToken as string | undefined;
    if (token) {
      setToken(token);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 403) {
      avisar403(error);
    }

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
      // refresh falhou — limpa sessão e manda pro login (respeitando o base path)
      setToken(null);
      const loginPath = `${import.meta.env.BASE_URL}login`.replace(/\/{2,}/g, '/');
      if (!location.pathname.startsWith(loginPath)) {
        location.assign(loginPath);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown, fallback = 'Ocorreu um erro.'): string {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' • ');
  if (typeof msg === 'string') return msg;
  if (e?.message) return e.message;
  return fallback;
}
