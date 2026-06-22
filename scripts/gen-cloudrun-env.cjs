/**
 * Gera cloudrun.env.yaml (gitignored) a partir de apps/api/.env, para uso com
 *   gcloud run deploy ... --env-vars-file cloudrun.env.yaml
 *
 * Ajustes automáticos:
 *  - NODE_ENV=development  (faz a API ler segredos das env vars, não do GCP Secret Manager)
 *  - CORS_ORIGIN inclui a URL do GitHub Pages
 *  - remove PORT (o Cloud Run injeta a porta automaticamente)
 *
 * Uso: node scripts/gen-cloudrun-env.cjs
 */
const fs = require('fs');
const path = require('path');

const PAGES_ORIGIN = 'https://ericolimaeducador-ux.github.io';
const envFile = path.join(__dirname, '..', 'apps', 'api', '.env');
const outFile = path.join(__dirname, '..', 'cloudrun.env.yaml');

const vars = {};
for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

// Overrides para o ambiente Cloud Run
vars.NODE_ENV = 'development';
vars.CORS_ORIGIN = `${PAGES_ORIGIN},http://localhost:5173`;
delete vars.PORT; // Cloud Run define a porta

// YAML com valores como strings JSON (seguro p/ caracteres especiais da URI/secrets)
const yaml = Object.entries(vars)
  .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
  .join('\n') + '\n';

fs.writeFileSync(outFile, yaml);
console.log(`✓ Gerado ${outFile} com ${Object.keys(vars).length} variáveis.`);
console.log('  (arquivo está no .gitignore — contém segredos, NÃO commitar)');
console.log('\nPróximo passo: gcloud run deploy nuvita-api --source . \\');
console.log('  --region southamerica-east1 --allow-unauthenticated \\');
console.log('  --env-vars-file cloudrun.env.yaml');
