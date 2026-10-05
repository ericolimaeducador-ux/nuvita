import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `globals`, o cleanup automático do Testing Library não se registra sozinho.
afterEach(() => cleanup());
