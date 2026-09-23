import { IconeEstomoterapia, IconePsicologia, IconeUrologia } from './IconesEspecialidades';

// Ilustrações abstratas de linha fina, uma por especialidade. Não são capturas de tela
// nem simulam dados de paciente: só reutilizam o motivo do ícone em escala grande.
const ANEL = 'currentColor';

function Moldura({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 480 360" fill="none" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

// Ondas concêntricas (fluxo) em torno da gota.
export function IlustracaoUrologia({ className }: { className?: string }) {
  return (
    <Moldura className={`text-quente ${className ?? ''}`}>
      {[70, 118, 166, 214].map((r, i) => (
        <circle key={r} cx="240" cy="180" r={r} stroke={ANEL} strokeOpacity={0.22 - i * 0.04} />
      ))}
      <IconeUrologia x="126" y="60" width="228" height="228" strokeWidth={0.55} className="text-quente" />
    </Moldura>
  );
}

// Camadas de pele em corte; à esquerda, elipses decrescentes ligadas por uma linha: a evolução da lesão.
export function IlustracaoEstomoterapia({ className }: { className?: string }) {
  return (
    <Moldura className={`text-quente ${className ?? ''}`}>
      <IconeEstomoterapia x="150" y="26" width="290" height="290" strokeWidth={0.5} className="text-quente" />
      <path d="M52 300h150" stroke={ANEL} strokeOpacity="0.25" />
      <ellipse cx="72" cy="300" rx="30" ry="12" stroke="#C9A15A" strokeWidth="1.5" />
      <ellipse cx="132" cy="300" rx="20" ry="8" stroke="#C9A15A" strokeWidth="1.5" strokeOpacity="0.8" />
      <ellipse cx="180" cy="300" rx="10" ry="4" stroke="#C9A15A" strokeWidth="1.5" strokeOpacity="0.6" />
    </Moldura>
  );
}

// Dois círculos que se encontram, com arcos de escuta ao redor.
export function IlustracaoPsicologia({ className }: { className?: string }) {
  return (
    <Moldura className={`text-quente ${className ?? ''}`}>
      <path d="M70 180a170 170 0 0 1 340 0" stroke={ANEL} strokeOpacity="0.18" />
      <path d="M100 180a140 140 0 0 1 280 0" stroke={ANEL} strokeOpacity="0.22" />
      <path d="M70 180a170 170 0 0 0 340 0" stroke={ANEL} strokeOpacity="0.1" />
      <IconePsicologia x="110" y="50" width="260" height="260" strokeWidth={0.55} className="text-quente" />
    </Moldura>
  );
}
