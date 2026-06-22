import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// A API NestJS sobe sem prefixo global e define o cookie de refresh no path
// /auth. Por isso servimos a API nos mesmos paths da origem (sem prefixo /api):
// em dev o proxy do Vite encaminha /auth, /pacientes, ... para :3000; em prod
// o nginx faz o mesmo. Assim o cookie (path /auth) é enviado em /auth/refresh.
// Para apontar para um host externo, defina VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = 'nuvita.accessToken';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
  return config;
});

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
