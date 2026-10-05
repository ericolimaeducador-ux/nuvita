import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `globals`, o cleanup automático do Testing Library não se registra sozinho.
afterEach(() => cleanup());

// jsdom não implementa elementFromPoint (react-big-calendar usa ao montar/arrastar).
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

// Radix Select/Popover em jsdom: APIs de ponteiro e scroll que o jsdom não implementa.
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
