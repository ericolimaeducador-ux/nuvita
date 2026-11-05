// Gera o PDF do guia a partir de PRIMEIROS-15-MINUTOS.md, embutindo as imagens (que ficam FORA do repo).
// Requer `marked` (npm install --no-save marked@12) e `playwright`. Uso:
//   node docs/guia/gerar-pdf.mjs
//   EXT_DIR=<pasta com img/>  PDF_OUT=<arquivo.pdf>  (padrão: <pasta irmã do clone>/nuvita-psi-guia-15min/)
import { chromium } from 'playwright';
import { marked } from 'marked';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const EXT = process.env.EXT_DIR ?? resolve(AQUI, '..', '..', '..', 'nuvita-psi-guia-15min');
const SAIDA = process.env.PDF_OUT ?? join(EXT, 'PRIMEIROS-15-MINUTOS.pdf');
const TMP = join(EXT, 'guia-tmp.html');

const md = readFileSync(join(AQUI, 'PRIMEIROS-15-MINUTOS.md'), 'utf-8');
const renderer = new marked.Renderer();
renderer.image = (href, _t, alt) => `<figure><img src="${pathToFileURL(resolve(EXT, href)).href}" /><figcaption>${alt}</figcaption></figure>`;
marked.setOptions({ renderer, gfm: true });

const css = `
@page { size: A4; margin: 14mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1b1f24; }
h1 { font-size: 21pt; color: #0c4aa6; margin: 0 0 4px; }
h2 { font-size: 14pt; color: #0c4aa6; margin: 18px 0 4px; page-break-after: avoid; }
blockquote { border-left: 4px solid #f0b400; margin: 10px 0; padding: 4px 12px; background: #fff8e1; page-break-inside: avoid; }
figure { margin: 8px 0; page-break-inside: avoid; }
figure img { max-width: 100%; max-height: 120mm; border: 1px solid #c9d1db; border-radius: 4px; display: block; }
figcaption { font-size: 8.5pt; color: #5b6572; }
code { background: #eef1f5; padding: 0 3px; border-radius: 3px; }
hr { border: 0; border-top: 1px solid #c9d1db; margin: 14px 0; }
`;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${marked.parse(md)}</body></html>`;
writeFileSync(TMP, html, 'utf-8');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
await page.pdf({ path: SAIDA, format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#5b6572"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' } });
await browser.close();
console.log('PDF:', SAIDA);
