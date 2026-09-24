import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression guard: every browser-facing API controller prefix must be proxied
 * by the Vite dev server (apps/web/vite.config.ts). A prefix missing from that
 * allowlist is answered by Vite with index.html (HTTP 200, text/html), which
 * crashes the SPA at runtime (e.g. `tickets.map is not a function`).
 *
 * apps/web has no test runner (PENDENCIAS #9), so the guard lives here and
 * reads both sides as text.
 */

const MODULES_DIR = join(__dirname, '..', '..', 'modules');
const VITE_CONFIG = join(__dirname, '..', '..', '..', '..', 'web', 'vite.config.ts');

/**
 * Controller prefixes deliberately exempt from the dev-proxy requirement.
 *
 * `internal` — Cloud Scheduler calls it server-to-server (reminders job); it is
 * never requested from the browser, so the Vite dev proxy has no reason to know it.
 *
 * DO NOT add a prefix here just because this test broke for you. A prefix belongs
 * here only if it is provably never called from the browser. If the SPA calls it,
 * add it to the proxy allowlist in apps/web/vite.config.ts instead. Changing this
 * list requires an explicit decision from the project owner.
 */
const NOT_BROWSER_FACING = new Set(['internal']);

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return full.endsWith('.controller.ts') ? [full] : [];
  });
}

function controllerPrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const file of controllerFiles(MODULES_DIR)) {
    const match = readFileSync(file, 'utf8').match(/@Controller\(\s*'([^']+)'\s*\)/);
    if (match) prefixes.add(match[1].split('/')[0]);
  }
  return [...prefixes].sort();
}

function viteProxyPattern(): RegExp {
  const source = readFileSync(VITE_CONFIG, 'utf8');
  const match = source.match(/proxy:\s*\{\s*'([^']+)'/);
  if (!match) throw new Error('Could not locate the proxy pattern in apps/web/vite.config.ts');
  return new RegExp(match[1]);
}

describe('Vite dev proxy covers every browser-facing API controller', () => {
  const prefixes = controllerPrefixes().filter((p) => !NOT_BROWSER_FACING.has(p));

  it('finds the controller prefixes (sanity)', () => {
    expect(prefixes.length).toBeGreaterThan(10);
    expect(prefixes).toContain('pacientes');
  });

  it.each(prefixes)('proxies /%s to the API', (prefix) => {
    const pattern = viteProxyPattern();
    expect(pattern.test(`/${prefix}`)).toBe(true);
    expect(pattern.test(`/${prefix}/x?y=1`)).toBe(true);
  });
});
