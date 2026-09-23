import type { SVGProps } from 'react';

// Motivos de linha fina (traço 1.5, sem preenchimento), um por especialidade.
// O traço principal usa currentColor; o detalhe em dourado da marca é fixo.
const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 48 48',
  fill: 'none',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
const OURO = '#C9A15A';

// Gota com o trajeto do fluxo urinário desenhado por dentro.
export function IconeUrologia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path stroke="currentColor" d="M24 5C24 5 11 19.5 11 29a13 13 0 0 0 26 0C37 19.5 24 5 24 5Z" />
      <path stroke={OURO} d="M24 17v9c0 3.5 4 3.5 4 7" />
      <circle cx="28" cy="36" r="1.2" stroke={OURO} />
    </svg>
  );
}

// Camadas de pele em corte, com o leito da lesão na camada superior.
export function IconeEstomoterapia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path stroke="currentColor" d="M4 18 24 8l20 10-20 10L4 18Z" />
      <path stroke="currentColor" d="m4 25 20 10 20-10" />
      <path stroke="currentColor" d="m4 32 20 10 20-10" />
      <ellipse cx="24" cy="18" rx="4.5" ry="2.2" stroke={OURO} />
    </svg>
  );
}

// Dois círculos que se sobrepõem (escuta / mente), com a área de encontro em dourado.
export function IconePsicologia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="18" cy="24" r="13" stroke="currentColor" />
      <circle cx="30" cy="24" r="13" stroke="currentColor" />
      <path stroke={OURO} d="M24 15.2a13 13 0 0 1 0 17.6 13 13 0 0 1 0-17.6Z" />
    </svg>
  );
}
