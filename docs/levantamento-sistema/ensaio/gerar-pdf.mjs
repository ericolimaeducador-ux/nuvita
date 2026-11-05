// Gera o PDF de apresentação a partir de LEVANTAMENTO.md, embutindo os screenshots (que ficam FORA do repo).
// Requer `marked` (npm install --no-save marked@12). Uso:
//   node gerar-pdf.mjs   (saída padrão: <pasta irmã do clone>/nuvita-psi-levantamento/LEVANTAMENTO-2026-10-22.pdf)
import { chromium } from 'playwright';
import { marked } from 'marked';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DOC = resolve(AQUI, '..');
const EXT = process.env.EXT_DIR ?? resolve(DOC, '..', '..', '..', 'nuvita-psi-levantamento');
const SAIDA = process.env.PDF_OUT ?? join(EXT, 'LEVANTAMENTO-2026-10-22.pdf');
const TMP = process.env.HTML_TMP ?? join(AQUI, '..', '..', '..', '..', 'levantamento-tmp.html');

let md = readFileSync(join(DOC, 'LEVANTAMENTO.md'), 'utf-8');
// O índice do .md é substituído por um índice navegável gerado aqui (âncoras dos títulos).
const iIndice = md.indexOf('## Índice');
const iFim = md.indexOf('\n---\n', iIndice);
const antes = md.slice(0, iIndice);
const depois = md.slice(iFim + 5);
// campo de comentário: caixa em branco visível
const corpo = depois.replace(/^\*\*Comentário do Erico:\*\* _\s*$/gm, '\n\n<div class="comentario"><b>Comentário do Erico:</b></div>\n\n');

const toc = [];
let n = 0;
const renderer = new marked.Renderer();
renderer.heading = function (text, nivel) {
  const id = 'h' + ++n;
  if (nivel === 1 || nivel === 2) toc.push({ nivel, id, texto: text.replace(/<[^>]+>/g, '') });
  return `<h${nivel} id="${id}">${text}</h${nivel}>`;
};
renderer.image = function (href, _t, alt) {
  const abs = pathToFileURL(resolve(EXT, href.replace(/^\.\.\//, ''))).href;
  return `<figure><img src="${abs}" /><figcaption>${alt}</figcaption></figure>`;
};
marked.setOptions({ renderer, breaks: true, gfm: true });
const htmlCorpo = marked.parse(corpo);
const htmlAntes = marked.parse(antes.replace(/\.\.\/screenshots\//g, '../screenshots/'));
const indice = '<h2 class="indice">Índice</h2><ul class="toc">' + toc.map((t) => `<li class="n${t.nivel}"><a href="#${t.id}">${t.texto}</a></li>`).join('') + '</ul>';

const css = `
@page { size: A4; margin: 14mm 14mm 16mm 14mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.38; color: #1b1f24; }
h1 { font-size: 19pt; border-bottom: 2px solid #0c4aa6; padding-bottom: 4px; page-break-before: always; margin-top: 0; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: 13.5pt; color: #0c4aa6; margin: 16px 0 4px; page-break-after: avoid; }
code { background: #eef1f5; padding: 0 3px; border-radius: 3px; font-size: 9pt; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; page-break-inside: auto; }
th, td { border: 1px solid #c9d1db; padding: 3px 6px; vertical-align: top; }
th { background: #eaf0f8; }
blockquote { border-left: 3px solid #f0b400; margin: 8px 0; padding: 2px 10px; background: #fff8e1; }
figure { margin: 8px 0; page-break-inside: avoid; }
figure img { max-width: 100%; max-height: 185mm; border: 1px solid #c9d1db; display: block; }
figcaption { font-size: 8pt; color: #5b6572; }
.comentario { border: 1.5px dashed #6b7686; border-radius: 4px; min-height: 26mm; padding: 4px 8px; margin: 8px 0 14px; color: #5b6572; page-break-inside: avoid; }
.toc { list-style: none; padding-left: 0; } .toc li { margin: 2px 0; } .toc .n1 { font-weight: 700; margin-top: 8px; } .toc .n2 { padding-left: 16px; font-size: 9pt; }
.toc a { color: #0c4aa6; text-decoration: none; }
.indice { page-break-before: always; }
`;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${htmlAntes}${indice}${htmlCorpo}</body></html>`;
writeFileSync(TMP, html, 'utf-8');

mkdirSync(EXT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 });
const semImagem = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).length);
await page.pdf({
  path: SAIDA, format: 'A4', printBackground: true, outline: true, tagged: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#6b7686">nuvita-psi — levantamento 22/10/2026 — pág. <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
  margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
});
const imagens = await page.evaluate(() => document.images.length);
await browser.close();
console.log(`PDF: ${SAIDA} | imagens embutidas: ${imagens} (quebradas: ${semImagem})`);
