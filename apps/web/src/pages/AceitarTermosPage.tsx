import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import {
  termoDeTesteTexto,
  termosDeUsoTexto,
  TERMO_DE_TESTE_VERSAO_ATUAL,
  TERMO_DE_TESTE_VIGENCIA,
  TERMOS_DE_USO_VERSAO_ATUAL,
  TERMOS_DE_USO_VIGENCIA,
} from '@/legal/termos';

/**
 * Gate de aceite dos Termos de Uso (feature-terms-of-service-acceptance).
 * Mostra o texto integral da versão vigente; o aceite exige uma ação
 * explícita (checkbox não pré-marcado). Ao aceitar, o usuário local é
 * atualizado e a GateChain re-avalia (próximo gate ou app).
 */
export function AceitarTermosPage() {
  const { user, atualizarUsuario, logout } = useAuth();
  // Clínica em fase de teste (teste beta): o aceite é do Termo de Teste, não dos
  // Termos de Uso. Mesma regra de versaoTermosExigida() (GateChain e API).
  const emTeste = user?.faseTeste === true;
  const termo = emTeste
    ? { titulo: 'Termo de Teste — Nuvita Psi', nome: 'o Termo de Teste', texto: termoDeTesteTexto, versao: TERMO_DE_TESTE_VERSAO_ATUAL, vigencia: TERMO_DE_TESTE_VIGENCIA }
    : { titulo: 'Termos de Uso — Nuvita Psi', nome: 'os Termos de Uso', texto: termosDeUsoTexto, versao: TERMOS_DE_USO_VERSAO_ATUAL, vigencia: TERMOS_DE_USO_VIGENCIA };
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    try {
      const { user: atualizado } = await authApi.aceitarTermos(termo.versao);
      atualizarUsuario(atualizado);
      toast.success(emTeste ? 'Termo de Teste aceito.' : 'Termos aceitos.');
    } catch (err) {
      toast.error('Não foi possível registrar o aceite', apiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">{termo.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            Versão {termo.versao} · {termo.vigencia}. Para usar a plataforma,
            leia e aceite {termo.nome} abaixo.
          </p>
        </header>

        <article className="max-h-[55vh] overflow-y-auto rounded-lg border border-border bg-card p-4 text-sm">
          <TermosRenderizados texto={termo.texto} />
        </article>

        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
          <Checkbox
            checked={aceito}
            onCheckedChange={(c) => setAceito(c === true)}
            aria-label={`Li e aceito ${termo.nome}`}
          />
          <span>Li e aceito {termo.nome} do Nuvita Psi (versão {termo.versao}).</span>
        </label>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm underline text-muted-foreground"
            onClick={() => void logout()}
          >
            Sair
          </button>
          <Button type="button" disabled={!aceito || enviando} onClick={() => void confirmar()}>
            {enviando ? 'Registrando…' : 'Aceitar e continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Renderizador mínimo: só o que o termo usa (títulos `#`/`##`/`###` e `**negrito**`). */
function TermosRenderizados({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('\n').map((linha, i) => {
        const titulo = linha.match(/^(#{1,3})\s+(.*)$/);
        if (titulo) {
          const nivel = titulo[1].length;
          const Tag = (['h2', 'h3', 'h4'] as const)[nivel - 1];
          return (
            <Tag key={i} className="font-semibold mt-3 mb-1">
              {inline(titulo[2])}
            </Tag>
          );
        }
        if (linha.trim().startsWith('<!--') || dentroDeComentario(texto, i)) {
          return null;
        }
        if (linha.trim() === '' || linha.trim() === '---') {
          return <div key={i} className="h-2" />;
        }
        const item = linha.match(/^\s*-\s+(.*)$/);
        if (item) {
          return (
            <p key={i} className="mb-1 leading-relaxed flex gap-2">
              <span aria-hidden>•</span>
              <span>{inline(item[1])}</span>
            </p>
          );
        }
        return (
          <p key={i} className="mb-1 leading-relaxed">
            {inline(linha)}
          </p>
        );
      })}
    </>
  );
}

function inline(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i}>{parte.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

/** Linhas dentro de um comentário HTML (notas internas do .md, ex.: aviso de versão) não aparecem. */
function dentroDeComentario(texto: string, indiceLinha: number): boolean {
  const linhas = texto.split('\n');
  let aberto = false;
  for (let i = 0; i <= indiceLinha; i++) {
    if (linhas[i].includes('<!--')) aberto = true;
    if (aberto && i === indiceLinha) return true;
    if (linhas[i].includes('-->')) aberto = false;
  }
  return false;
}
