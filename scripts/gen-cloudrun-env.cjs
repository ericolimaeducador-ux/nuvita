/**
 * Gera cloudrun.env.yaml (gitignored) para uso com
 *   gcloud run deploy ... --env-vars-file cloudrun.env.yaml
 *
 * A fonte PADRÃO é apps/api/.env.production, e não apps/api/.env. O .env é o
 * ambiente de desenvolvimento — Mongo local, bucket "-dev", endpoint de teste.
 * Gerar produção a partir dele publica credencial de dev com NODE_ENV=production,
 * e nenhuma validação de segredo pega isso: os valores são "fortes", só apontam
 * para o lugar errado. Manter os dois ambientes em arquivos separados é o que
 * torna esse erro impossível em vez de improvável.
 *
 * Uso: node scripts/gen-cloudrun-env.cjs [caminho/para/.env.production]
 *
 * Ajustes automáticos:
 *  - NODE_ENV=production   (postura segura: Swagger fechado, CSP ligado, logs sane)
 *  - CONFIG_SOURCE=env     (lê segredos das env vars, NÃO do GCP Secret Manager)
 *  - LOG_LEVEL=info        (evita logs debug verbosos com possível PII em produção)
 *  - CORS_ORIGIN inclui a URL do GitHub Pages
 *  - remove PORT (o Cloud Run injeta a porta automaticamente)
 *
 * Uso: node scripts/gen-cloudrun-env.cjs
 */
const fs = require('fs');
const path = require('path');

// Origens permitidas no CORS em produção. nuvita-psi roda como subdomínio do
// Nuvita original (psi.nuvita.app.br); localhost p/ dev local.
const PROD_ORIGINS = [
  'https://psi.nuvita.app.br',
  // Landing do teste beta (pagina extra do site Nuvita) -> POST /inscricoes-teste
  'https://www.nuvita.app.br',
  'http://localhost:5173',
];
const PROD_ROOT_DOMAIN = 'psi.nuvita.app.br';
const envFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'apps', 'api', '.env.production');
const outFile = path.join(__dirname, '..', 'cloudrun.env.yaml');

if (!fs.existsSync(envFile)) {
  console.error(`✗ Arquivo de origem não encontrado: ${envFile}\n`);
  console.error('  Crie o ambiente de produção a partir do template:');
  console.error('    cp .env.example apps/api/.env.production');
  console.error('  e preencha com os recursos de PRODUÇÃO (Mongo, Redis, R2 próprios).');
  console.error('\n  Para gerar a partir de outro arquivo:');
  console.error('    node scripts/gen-cloudrun-env.cjs caminho/para/arquivo');
  process.exit(1);
}

console.log(`Origem: ${envFile}`);

const vars = {};
for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

// Overrides para o ambiente Cloud Run
vars.NODE_ENV = 'production';
vars.CONFIG_SOURCE = 'env';
vars.LOG_LEVEL = 'info';
vars.CORS_ORIGIN = PROD_ORIGINS.join(',');
vars.APP_ROOT_DOMAIN = PROD_ROOT_DOMAIN;
delete vars.PORT; // Cloud Run define a porta
delete vars.EXPOSE_DOCS; // Swagger fechado em produção

// YAML com valores como strings JSON (seguro p/ caracteres especiais da URI/secrets)
const yaml = Object.entries(vars)
  .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
  .join('\n') + '\n';

fs.writeFileSync(outFile, yaml);
console.log(`✓ Gerado ${outFile} com ${Object.keys(vars).length} variáveis.`);
console.log('  (arquivo está no .gitignore — contém segredos, NÃO commitar)');
console.log('\nPróximo passo: gcloud run deploy nuvita-psi-api --project nuvita-499800 --source . \\');
console.log('  --region southamerica-east1 --allow-unauthenticated \\');
console.log('  --env-vars-file cloudrun.env.yaml');
