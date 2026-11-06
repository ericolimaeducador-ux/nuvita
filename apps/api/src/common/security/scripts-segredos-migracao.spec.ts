import { execFileSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * R1 — trava dos scripts de segredos: PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY e PRONTUARIO_SIGNATURE_SECRET
 * são REAPROVEITADAS do serviço real do Nuvita, nunca geradas nem rotacionadas. Os scripts não as geram/rotacionam e
 * ABORTAM se alguém tentar incluí-las (flag ou lista).
 */
const raiz = join(__dirname, '..', '..', '..', '..', '..');
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8');
const GEN = 'scripts/gen-production-secrets.mjs';
const ROT = 'scripts/rotate-secrets-worker.mjs';
const GUARDA = 'scripts/lib/segredos-reaproveitados.mjs';

describe('R1 — scripts de segredos não geram nem rotacionam as chaves reaproveitadas', () => {
  it('gen-production-secrets não gera as três chaves e trava argumentos e a própria lista', () => {
    const s = ler(GEN);
    expect(s).not.toMatch(/(PATIENT_DATA_ENCRYPTION_KEY|PATIENT_DATA_HASH_KEY|PRONTUARIO_SIGNATURE_SECRET)\s*:\s*generate/);
    expect(s).not.toMatch(/(PATIENT_DATA_ENCRYPTION_KEY|PATIENT_DATA_HASH_KEY|PRONTUARIO_SIGNATURE_SECRET)=\$\{secrets/);
    expect(s).toMatch(/abortarSeChaveReaproveitada\(process\.argv\.slice\(2\)/);
    expect(s).toMatch(/abortarSeChaveReaproveitada\(Object\.keys\(secrets\)/);
  });

  it('rotate-secrets-worker não lista as chaves para rotação e aborta se a lista ou os argumentos as incluírem', () => {
    const s = ler(ROT);
    expect(s).not.toMatch(/name:\s*'(prontuario-signature-secret|patient-data-encryption-key|patient-data-hash-key)'/);
    expect(s).toMatch(/abortarSeChaveReaproveitada\(\[\.\.\.ROTATION_POLICIES\.map/);
  });

  it('a trava aborta com a explicação para qualquer forma do nome (env, Secret Manager, flag)', () => {
    const codigo = `
      import('${pathToFileURL(join(raiz, GUARDA)).href}').then((m) => {
        const casos = [['--incluir=PATIENT_DATA_HASH_KEY'], ['patient-data-encryption-key'], ['jwt-access-secret', 'prontuario-signature-secret'], ['--incluir=JWT_ACCESS_SECRET']];
        const r = casos.map((c) => { try { m.abortarSeChaveReaproveitada(c, 'teste'); return 'ok'; } catch (e) { return e.message; } });
        console.log(JSON.stringify(r));
      });`;
    const saida = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', codigo], { encoding: 'utf8' })) as string[];
    expect(saida.slice(0, 3).every((m) => /REAPROVEITADAS do serviço real/.test(m) && /NUNCA geradas nem rotacionadas/.test(m))).toBe(true);
    expect(saida[3]).toBe('ok');
  });

  it('rodar o gerador pedindo uma chave reaproveitada ABORTA (código 1) e não grava arquivo nenhum', () => {
    const destino = join(raiz, '.env.production.example');
    const antes = existsSync(destino) ? statSync(destino).mtimeMs : null;
    const r = spawnSync(process.execPath, [join(raiz, GEN), '--incluir=PATIENT_DATA_ENCRYPTION_KEY'], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/REAPROVEITADAS do serviço real do Nuvita/);
    expect(existsSync(destino) ? statSync(destino).mtimeMs : null).toBe(antes);
  });
});
