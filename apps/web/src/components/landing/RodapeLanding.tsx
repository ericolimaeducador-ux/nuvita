import { Link } from 'react-router-dom';
import logoDourado from '@/assets/logo-dourado.png';

const ESTOMOTERAPIA_URL = 'https://estomoterapia.nuvita.app.br';
const PSICOLOGIA_URL = 'https://psi.nuvita.app.br';

const linkClasse = 'w-fit text-left hover:text-ouro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ouro';

// comBanner: reserva espaço no fim da página para o banner de cookies (fixo) não cobrir o rodapé.
export function RodapeLanding({ comBanner = false, onEntrarUrologia }: { comBanner?: boolean; onEntrarUrologia: () => void }) {
  return (
    <footer className={`bg-petroleo px-6 pt-14 text-quente/80 ${comBanner ? 'pb-32 sm:pb-24' : 'pb-10'}`}>
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src={logoDourado} alt="Nuvita — gestão de saúde na nuvem" className="h-12 w-auto" />
          <a href="mailto:comercial@swbbrasil.com.br" className="mt-5 inline-block text-sm hover:text-ouro">
            comercial@swbbrasil.com.br
          </a>
        </div>
        <nav aria-label="Produtos" className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-semibold text-quente">Produtos</p>
          <button type="button" onClick={onEntrarUrologia} className={linkClasse}>Urologia</button>
          <a href={ESTOMOTERAPIA_URL} target="_blank" rel="noopener noreferrer" className={linkClasse}>Estomoterapia</a>
          <a href={PSICOLOGIA_URL} target="_blank" rel="noopener noreferrer" className={linkClasse}>Psicologia</a>
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-semibold text-quente">Legal</p>
          <Link to="/privacidade" className={linkClasse}>Política de Privacidade</Link>
          <Link to="/termos" className={linkClasse}>Termos de Uso</Link>
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-sage/30 pt-6 text-xs text-quente/60">
        © {new Date().getFullYear()} Nuvita · Todos os direitos reservados
      </p>
    </footer>
  );
}
