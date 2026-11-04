import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Condição (a) do sentinela, por construção: só o repositório conhece o prefixo e só a infraestrutura de clínicas lê o campo cru.
// Se alguém criar outro leitor de `cnpj`, este teste obriga a passar pelo repositório (que devolve documento vazio).
const RAIZ = join(__dirname, '..', '..');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return caminho.endsWith('.ts') && !caminho.endsWith('.spec.ts') ? [caminho] : [];
  });
}
const rel = (c: string) => c.replace(RAIZ, '').replace(/\\/g, '/');
const fontes = arquivos(RAIZ);

describe('sentinela SEM-DOCUMENTO-: quem o conhece', () => {
  it('só clinica-mongo.repository.ts menciona o prefixo no código de produção', () => {
    const quem = fontes.filter((f) => readFileSync(f, 'utf8').includes('SEM-DOCUMENTO')).map(rel);
    expect(quem).toEqual(['/modules/clinicas/infrastructure/mongo/clinica-mongo.repository.ts']);
  });

  it('o modelo cru da clínica (ClinicaMongo) só é lido pelo repositório; os módulos apenas o registram', () => {
    const quem = fontes
      .filter((f) => /\.(find|findOne|findById|aggregate|countDocuments)\(/.test(readFileSync(f, 'utf8')) && readFileSync(f, 'utf8').includes('ClinicaMongo'))
      .map(rel);
    expect(quem).toEqual(['/modules/clinicas/infrastructure/mongo/clinica-mongo.repository.ts']);
  });
});
