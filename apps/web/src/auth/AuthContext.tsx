import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getClinicaAtiva, getToken, setClinicaAtiva, setToken } from '@/api/client';
import { authApi } from '@/api/resources';
import { resolvePermissoes, type AuthUser, type Modulo } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  /** Permissões efetivas de módulos (fallback: padrão do papel p/ sessões antigas). */
  permissoes: Modulo[];
  /** Clínica que o SUPER_ADMIN está operando (null = nenhuma selecionada). */
  clinicaAtiva: string | null;
  trocarClinica: (clinicaId: string | null) => void;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const USER_KEY = 'nuvita.user';
const AuthCtx = createContext<AuthState | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [token, setTok] = useState<string | null>(getToken());
  const [loading] = useState(false);
  const [clinicaAtiva, setClinicaAtivaState] = useState<string | null>(getClinicaAtiva());

  const trocarClinica = useCallback((clinicaId: string | null) => {
    setClinicaAtiva(clinicaId); // persiste no localStorage (lido pelo interceptor do axios)
    setClinicaAtivaState(clinicaId);
  }, []);

  const login = useCallback(
    async (email: string, password: string, totpCode?: string) => {
      const res = await authApi.login(email, password, totpCode);
      setToken(res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setTok(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignora erro de logout — limpamos a sessão localmente de qualquer forma
    }
    setToken(null);
    setClinicaAtiva(null);
    localStorage.removeItem(USER_KEY);
    setTok(null);
    setUser(null);
    setClinicaAtivaState(null);
  }, []);

  // sincroniza logout entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'nuvita.accessToken' && !e.newValue) {
        setTok(null);
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const permissoes = useMemo<Modulo[]>(
    () => (user ? user.permissoes ?? resolvePermissoes(user.papel) : []),
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, permissoes, clinicaAtiva, trocarClinica, login, logout }),
    [user, token, loading, permissoes, clinicaAtiva, trocarClinica, login, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
