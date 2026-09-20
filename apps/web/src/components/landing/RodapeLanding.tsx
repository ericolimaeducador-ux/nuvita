import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

// comBanner: reserva espaço no fim da página para o banner de cookies (fixo) não cobrir o rodapé.
export function RodapeLanding({ comBanner = false }: { comBanner?: boolean }) {
  return (
    <footer className={`bg-bg-dark px-6 py-10 text-blue-100/80 ${comBanner ? 'pb-32 sm:pb-24' : ''}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo width={120} iconColor="#FFB800" textColor="#FFFFFF" />
        <p className="text-sm">© {new Date().getFullYear()} Nuvita · Portal de saúde na nuvem</p>
        <Link to="/privacidade" className="text-sm underline underline-offset-2 hover:text-white">
          Política de Privacidade
        </Link>
      </div>
    </footer>
  );
}
