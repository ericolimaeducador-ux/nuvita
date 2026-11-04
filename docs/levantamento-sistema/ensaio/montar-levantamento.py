"""Costura os capítulos em LEVANTAMENTO.md (índice no topo). Uso: python montar-levantamento.py"""
import re
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
capitulos = sorted(p for p in raiz.glob('[0-9][0-9]-*.md') if not p.name.startswith('00-'))

def ancora(titulo: str) -> str:
    t = re.sub(r'[^\w\s-]', '', titulo.lower(), flags=re.UNICODE).strip()
    return re.sub(r'\s+', '-', t)

partes = []
indice = []
for cap in capitulos:
    texto = cap.read_text(encoding='utf-8')
    titulo = texto.splitlines()[0].lstrip('# ').strip()
    indice.append(f'- [{titulo}](#{ancora(titulo)}) — `{cap.name}`')
    partes.append(texto.rstrip() + '\n')

cabeca = r"""# Levantamento completo do sistema — nuvita-psi

Público: Erico. Ambiente: **local, dados fictícios**, 22/10/2026. Tom técnico. Cada tela traz: perfis com acesso,
o que faz, screenshot, campos e ações, **estado**, o que foi **observado**, o que **falta** e um espaço em branco
para o seu comentário.

> **Imagens fora do repositório.** Os screenshots ficam em `C:\Users\erico\nuvita-psi-levantamento\screenshots\`
> (fora de qualquer repo). Os capítulos referenciam `../screenshots/...`: para ver as imagens ao ler os `.md`,
> coloque a pasta `levantamento-sistema` ao lado da pasta `screenshots`. O PDF `LEVANTAMENTO-2026-10-22.pdf`
> (na mesma pasta externa) é a **versão completa para apresentação**, com as imagens embutidas e o campo
> "Comentário do Erico" em branco em cada tela.

Leia antes: [`00-MAPA-COMPLETO.md`](00-MAPA-COMPLETO.md) (rotas e matriz perfil × acesso),
[`ACHADOS.md`](ACHADOS.md) (o que está quebrado, falta ou é risco, **segurança no topo**) e
[`BUGS-ENCONTRADOS.md`](BUGS-ENCONTRADOS.md) (registro de engenharia, em inglês).

Estados usados: FUNCIONA / FUNCIONA COM RESSALVA / QUEBRADO / NÃO EXISTE AINDA / NÃO VERIFICÁVEL LOCALMENTE.

## Índice
"""
saida = cabeca + '\n'.join(indice) + '\n\n---\n\n' + '\n\n---\n\n'.join(partes)
(raiz / 'LEVANTAMENTO.md').write_text(saida, encoding='utf-8')
print(f'{len(capitulos)} capítulos -> LEVANTAMENTO.md ({len(saida.splitlines())} linhas)')
