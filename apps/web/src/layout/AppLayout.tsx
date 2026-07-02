import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Bell, DollarSign,
  Video, Building2, LogOut, ChevronLeft, ChevronRight, Activity, Scale, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { Modulo, Papel } from '@/types';
import { brand } from '@/lib/brand';

// Cada item é gateado pelo módulo correspondente (permissões efetivas do usuário,
// ajustáveis por checkbox no Super Admin). `roles` fica só como trava dura extra.
const navItems: { to: string; icon: React.ElementType; label: string; modulo: Modulo; roles?: Papel[] }[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', modulo: Modulo.DASHBOARD },
  { to: '/pacientes', icon: Users, label: 'Pacientes', modulo: Modulo.PACIENTES },
  { to: '/fluxo-clinico', icon: Activity, label: 'Fluxo Clínico', modulo: Modulo.FLUXO_CLINICO },
  { to: '/meus-processos', icon: Scale, label: 'Meus Processos', modulo: Modulo.PROCESSOS },
  { to: '/agenda', icon: Calendar, label: 'Agenda', modulo: Modulo.AGENDA },
  { to: '/notificacoes', icon: Bell, label: 'Notificações', modulo: Modulo.NOTIFICACOES },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro', modulo: Modulo.FINANCEIRO },
  { to: '/telemedicina', icon: Video, label: 'Telemedicina', modulo: Modulo.TELEMEDICINA },
  { to: '/clinica', icon: Building2, label: 'Clínica', modulo: Modulo.CLINICA },
  { to: '/super-admin', icon: Shield, label: 'Super Admin', modulo: Modulo.SUPER_ADMIN, roles: [Papel.SUPER_ADMIN] },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, permissoes, logout } = useAuth();

  const initials = user?.nome
    ? user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col bg-card/40 backdrop-blur-xl border-r border-white/5 overflow-hidden shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <img src={brand.mark.light} alt={brand.nome} className="h-8 w-auto shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="text-xl font-bold text-foreground"
              >
                {brand.nome}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems
            .filter(({ modulo, roles }) =>
              permissoes.includes(modulo) &&
              (!roles || (user?.papel && roles.includes(user.papel as Papel))))
            .map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 group relative',
                  active
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border-l-2 border-transparent'
                )}
              >
                <Icon className={cn('shrink-0 h-5 w-5', active && 'drop-shadow-[0_0_6px_hsl(217,91%,60%)]')} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-3 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-medium text-foreground truncate">{user?.nome ?? 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.papel ?? 'Admin'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={() => { void logout(); navigate('/login'); }}
          >
            <LogOut className="h-4 w-4" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2">
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
