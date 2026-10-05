import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `globals`, o cleanup automático do Testing Library não se registra sozinho.
afterEach(() => cleanup());

// jsdom não implementa elementFromPoint (react-big-calendar usa ao montar/arrastar).
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
