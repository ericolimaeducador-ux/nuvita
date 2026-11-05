/**
 * Pré-checagem do cloudrun.env.yaml ANTES de colar no GitHub Secrets.
 *
 * Desde que o boot passou a rejeitar segredo fraco ou placeholder
 * (apps/api/src/common/security/config-validation.ts), um cloudrun.env.yaml
 * malfeito só revela o problema no log do Cloud Run — depois do build da
 * imagem, do push e do deploy. No primeiro deploy isso é especialmente ruim,
 * porque é exatamente quando você não sabe se o erro é seu ou da infra.
 *
 * Este script roda o MESMO AppConfigService.initialize() que a API roda ao
 * subir, com as variáveis do arquivo. Ele não reimplementa nenhuma regra de
 * validação: se reimplementasse, as duas cópias divergiriam na primeira vez
 * que alguém mexesse numa delas, e o script passaria a mentir.
 *
 * Uso:
 *   node scripts/check-cloudrun-env.mjs [caminho/para/cloudrun.env.yaml]
 *
 * Exit code 0 = a API sobe com esse arquivo. 1 = não sobe.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const arquivo = resolve(process.argv[2] ?? join(raiz, 'cloudrun.env.yaml'));
const distConfig = join(
  raiz,
  'apps/api/dist/apps/api/src/common/security/config.service.js',
);

function erroFatal(mensagem, dica) {
  console.error(`\n✗ ${mensagem}`);
  if (dica) console.error(`\n  ${dica}`);
  process.exit(1);
}

if (!existsSync(arquivo)) {
  erroFatal(
    `Arquivo não encontrado: ${arquivo}`,
    'Gere com: node scripts/gen-cloudrun-env.cjs',
  );
}

if (!existsSync(distConfig)) {
  erroFatal(
    'A API não está compilada — este script valida contra o código real, não contra uma cópia das regras.',
    'Compile com: npm run build --workspace=apps/api',
  );
}

/**
 * O gen-cloudrun-env.cjs escreve `CHAVE: "valor"` com o valor em JSON, então
 * o parse é a inversa exata disso. Não é um parser de YAML genérico e não
 * precisa ser — só entende o que o gerador produz, e reclama do resto.
 */
function lerEnvYaml(caminho) {
  const vars = {};
  const linhasInvalidas = [];

  readFileSync(caminho, 'utf8')
    .split(/\r?\n/)
    .forEach((bruta, indice) => {
      const linha = bruta.trim();
      if (!linha || linha.startsWith('#')) return;

      const separador = linha.indexOf(':');
      if (separador === -1) {
        linhasInvalidas.push(`linha ${indice + 1}: ${linha}`);
        return;
      }

      const chave = linha.slice(0, separador).trim();
      const bruto = linha.slice(separador + 1).trim();

      try {
        vars[chave] = typeof JSON.parse(bruto) === 'string' ? JSON.parse(bruto) : String(JSON.parse(bruto));
      } catch {
        // Valor sem aspas: o gerador sempre escreve com aspas, mas alguém pode
        // ter editado o arquivo à mão. Aceita e segue.
        vars[chave] = bruto;
      }
    });

  return { vars, linhasInvalidas };
}

const { vars, linhasInvalidas } = lerEnvYaml(arquivo);

console.log(`Arquivo:   ${arquivo}`);
console.log(`Variáveis: ${Object.keys(vars).length}`);

if (linhasInvalidas.length > 0) {
  console.warn(`\n⚠ Linhas que não deu para interpretar (ignoradas):`);
  linhasInvalidas.forEach((l) => console.warn(`   ${l}`));
}

// Avisos de postura que não impedem o boot, mas quase certamente são engano:
// o arquivo existe para rodar no Cloud Run, e nesses dois casos ele não está
// descrevendo o Cloud Run.
if (vars.NODE_ENV !== 'production') {
  console.warn(
    `\n⚠ NODE_ENV=${vars.NODE_ENV ?? '(ausente)'} — fora de production a validação de` +
      ' segredos NÃO roda, então este check não prova nada sobre o deploy real.',
  );
}
if (vars.EXPOSE_DOCS === 'true') {
  console.warn('\n⚠ EXPOSE_DOCS=true — o Swagger ficará acessível em produção.');
}

// A partir daqui é o caminho real de boot. O ambiente do processo é substituído
// pelo conteúdo do arquivo para que o AppConfigService leia exatamente o que o
// container leria.
for (const chave of Object.keys(process.env)) {
  if (chave in vars) delete process.env[chave];
}
Object.assign(process.env, vars, { CONFIG_SOURCE: 'env' });

const { Logger } = require('@nestjs/common');
Logger.overrideLogger(false); // silencia o log de boot; o resultado é o que interessa

const { AppConfigService } = require(distConfig);

// O AppConfigService recebe o GoogleSecretsService por injeção, mas com
// CONFIG_SOURCE=env ele nunca é consultado — o stub existe só para satisfazer
// o construtor.
const googleSecretsStub = { getSecret: async () => null };

try {
  await new AppConfigService(googleSecretsStub).initialize();
  console.log('\n✓ A API sobe com este arquivo.');
  console.log('  Próximo passo: colar o conteúdo em CLOUDRUN_ENV_YAML (GitHub Secrets).');
  process.exit(0);
} catch (erro) {
  console.error('\n✗ A API NÃO sobe com este arquivo:\n');
  console.error(
    String(erro.message)
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n'),
  );
  // A mensagem de variável ausente vem do caminho de boot, que fala em .env
  // por ser o caso comum (dev local). Aqui o arquivo em questão é outro, e
  // seguir a instrução ao pé da letra levaria a mexer no lugar errado.
  if (String(erro.message).includes('.env.example')) {
    console.error(
      `\n  (a instrução acima é do boot da API; neste contexto, o arquivo a corrigir\n` +
        `   é ${arquivo} — ou o apps/api/.env que o originou, via gen-cloudrun-env.cjs)`,
    );
  }

  console.error('\n  Corrija e rode de novo — isso evita descobrir no log do Cloud Run.');
  process.exit(1);
}
