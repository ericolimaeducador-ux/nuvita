import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// Logo oficial Nuvita (vetorial definitivo): nuvem + batimento cardíaco + wordmark.
// Cores controladas por variáveis CSS (--logo-icon-color / --logo-text-color) para
// reuso em fundos claros e escuros. Os PNGs de `lib/brand.ts` seguem nos documentos
// impressos (fundo branco, sem dependência de fonte web).

// Traçado da nuvem + linha do batimento, compartilhado entre o logo completo e o ícone.
const ICON_PATHS = (
  <g
    stroke="var(--logo-icon-color, #E6A600)"
    strokeWidth={5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M 45 55 L 20 55 C 11.716 55 5 48.284 5 40 C 5 31.716 11.716 25 20 25 C 22.046 25 23.996 25.41 25.756 26.143 C 28.595 16.518 37.604 9.5 48.5 9.5 C 57.697 9.5 65.655 14.805 69.458 22.585 C 70.92 22.197 72.481 21.986 74.095 21.986 C 82.38 21.986 89.095 28.702 89.095 36.986 C 89.095 45.27 82.38 51.986 74.095 51.986 L 68 51.986" />
    <path d="M 25 42 L 40 42 L 46 28 L 56 60 L 62 42 L 78 42" />
  </g>
);

interface LogoProps {
  /** Largura em px (altura automática, proporção preservada). */
  width?: number | string;
  iconColor?: string;
  textColor?: string;
  className?: string;
}

export function Logo({
  width = 200,
  iconColor = '#FFB800',
  textColor = '#FFFFFF',
  className,
}: LogoProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: 'auto',
    '--logo-icon-color': iconColor,
    '--logo-text-color': textColor,
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 250 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={cn('nuvita-logo shrink-0', className)}
      role="img"
      aria-label="Nuvita"
    >
      {ICON_PATHS}
      <text
        x="105"
        y="55"
        fontFamily="'Plus Jakarta Sans', 'Inter', 'Montserrat', sans-serif"
        fontWeight="bold"
        fontSize={44}
        fill="var(--logo-text-color, #FFFFFF)"
      >
        Nuvita
      </text>
    </svg>
  );
}

interface LogoIconProps {
  size?: number | string;
  iconColor?: string;
  className?: string;
}

// Apenas o símbolo (nuvem + batimento), para a sidebar recolhida.
export function LogoIcon({ size = 32, iconColor = '#FFB800', className }: LogoIconProps) {
  const style = { '--logo-icon-color': iconColor } as CSSProperties;
  return (
    <svg
      viewBox="0 0 95 70"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Nuvita"
    >
      {ICON_PATHS}
    </svg>
  );
}
