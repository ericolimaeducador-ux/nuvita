import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Package, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { produtosApi, type ProdutoPayload } from '@/api/resources';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { toItems } from '@/utils';
import {
  EMBALAGEM_PRODUTO_LABEL, EmbalagemProduto, ProjetoCatalogo, SEXO_PRODUTO_LABEL, SexoProduto,
  TIPO_PRODUTO_LABEL, TipoProduto, type Produto,
} from '@/types';

/**
 * Catálogo operacional de produtos (global, sem e-commerce). Acesso: ADMIN/SUPER_ADMIN (módulo Clínica).
 * O catálogo começa VAZIO: o admin cadastra os produtos aqui.
 * TODO(conteudo): tipos, marcas e rótulos ("sonda", "coletor", Siafisico) são de incontinência urinária — revisar.
 */

interface FormProduto {
  codigo: string;
  codigoFabricante: string;
  nome: string;
  tipo: TipoProduto | '';
  sexo: SexoProduto | '';
  embalagem: EmbalagemProduto | '';
  projeto: ProjetoCatalogo | '';
  french: string;
  comprimentoCm: string;
  descricaoTecnica: string;
}

const VAZIO: FormProduto = {
  codigo: '', codigoFabricante: '', nome: '', tipo: '', sexo: '', embalagem: '', projeto: '',
  french: '', comprimentoCm: '', descricaoTecnica: '',
};

function doProduto(p: Produto): FormProduto {
  return {
    codigo: String(p.codigo),
    codigoFabricante: p.codigoFabricante ?? '',
    nome: p.nome,
    tipo: p.tipo,
    sexo: p.sexo,
    embalagem: p.embalagem,
    projeto: p.projeto,
    french: p.french !== undefined ? String(p.french) : '',
    comprimentoCm: p.comprimentoCm !== undefined ? String(p.comprimentoCm) : '',
    descricaoTecnica: p.descricaoTecnica,
  };
}

function erroDoForm(f: FormProduto, edicao: boolean): string | null {
  if (!edicao && !/^\d+$/.test(f.codigo.trim())) return 'Informe o código (somente números).';
  if (!f.nome.trim()) return 'Informe o nome.';
  if (!f.tipo || !f.sexo || !f.embalagem || !f.projeto) return 'Selecione tipo, sexo, embalagem e projeto.';
  if (!f.descricaoTecnica.trim()) return 'Informe a descrição técnica.';
  if (f.french && !/^\d+$/.test(f.french.trim())) return 'French deve ser um número inteiro.';
  if (f.comprimentoCm && Number.isNaN(Number(f.comprimentoCm.replace(',', '.')))) return 'Comprimento inválido.';
  return null;
}

function paraPayload(f: FormProduto): ProdutoPayload {
  return {
    codigo: Number(f.codigo),
    codigoFabricante: f.codigoFabricante.trim() || undefined,
    nome: f.nome.trim(),
    tipo: f.tipo,
    sexo: f.sexo,
    embalagem: f.embalagem,
    projeto: f.projeto,
    french: f.french.trim() ? Number(f.french) : undefined,
    comprimentoCm: f.comprimentoCm.trim() ? Number(f.comprimentoCm.replace(',', '.')) : undefined,
    descricaoTecnica: f.descricaoTecnica.trim(),
  };
}

export function ProdutosPage() {
  const qc = useQueryClient();
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null);
  const [form, setForm] = useState<FormProduto>(VAZIO);
  const [desativando, setDesativando] = useState<Produto | null>(null);

  const listQ = useQuery({
    queryKey: ['produtos', incluirInativos],
    queryFn: () => produtosApi.list({ incluirInativos }),
  });
  const produtos = toItems<Produto>(listQ.data as never);

  const sujo = editando !== null && JSON.stringify(form) !== JSON.stringify(editando === 'novo' ? VAZIO : doProduto(editando));
  const fechar = () => { setEditando(null); setForm(VAZIO); };
  const saida = useSaidaProtegida(sujo, fechar);

  const salvarMut = useMutation({
    mutationFn: () => {
      const payload = paraPayload(form);
      if (editando === 'novo') return produtosApi.create(payload);
      const { codigo: _codigo, ...semCodigo } = payload;
      return produtosApi.update((editando as Produto).codigo, semCodigo);
    },
    onSuccess: () => {
      toast.success(editando === 'novo' ? 'Produto cadastrado.' : 'Produto atualizado.');
      fechar();
      void qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e) => toast.error('Erro ao salvar o produto', apiErrorMessage(e)),
  });

  const desativarMut = useMutation({
    mutationFn: (codigo: number) => produtosApi.desativar(codigo),
    onSuccess: () => {
      toast.success('Produto desativado.');
      setDesativando(null);
      void qc.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (e) => toast.error('Erro ao desativar', apiErrorMessage(e)),
  });

  function set<K extends keyof FormProduto>(campo: K, valor: FormProduto[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  const erro = editando ? erroDoForm(form, editando !== 'novo') : null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Catálogo de produtos"
        subtitle="Produtos entregues aos pacientes. O catálogo é global e começa vazio: cadastre os itens aqui."
        extra={
          <Button onClick={() => { setForm(VAZIO); setEditando('novo'); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo produto
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="incluirInativos" checked={incluirInativos} onCheckedChange={(c) => setIncluirInativos(!!c)} />
            <Label htmlFor="incluirInativos" className="font-normal">Mostrar produtos inativos</Label>
          </div>

          {listQ.isError ? (
            <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="o catálogo de produtos" />
          ) : listQ.isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Embalagem</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{TIPO_PRODUTO_LABEL[p.tipo] ?? p.tipo}</TableCell>
                    <TableCell>{SEXO_PRODUTO_LABEL[p.sexo] ?? p.sexo}</TableCell>
                    <TableCell>{EMBALAGEM_PRODUTO_LABEL[p.embalagem] ?? p.embalagem}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'secondary' : 'outline'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Editar" aria-label={`Editar ${p.nome}`}
                        onClick={() => { setForm(doProduto(p)); setEditando(p); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {p.ativo && (
                        <Button variant="ghost" size="icon" title="Desativar" aria-label={`Desativar ${p.nome}`}
                          onClick={() => setDesativando(p)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {produtos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      <Package className="mx-auto mb-2 h-6 w-6 opacity-50" />
                      Nenhum produto cadastrado. Use "Novo produto" para começar o catálogo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editando !== null} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" {...saida.contentProps}>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Novo produto' : 'Editar produto'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prodCodigo">Código *</Label>
              <Input id="prodCodigo" inputMode="numeric" value={form.codigo} disabled={editando !== 'novo'}
                onChange={(e) => set('codigo', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prodCodFab">Código do fabricante</Label>
              <Input id="prodCodFab" value={form.codigoFabricante} onChange={(e) => set('codigoFabricante', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="prodNome">Nome *</Label>
              <Input id="prodNome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo || undefined} onValueChange={(v) => set('tipo', v as TipoProduto)}>
                <SelectTrigger aria-label="Tipo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoProduto).map((v) => <SelectItem key={v} value={v}>{TIPO_PRODUTO_LABEL[v]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sexo *</Label>
              <Select value={form.sexo || undefined} onValueChange={(v) => set('sexo', v as SexoProduto)}>
                <SelectTrigger aria-label="Sexo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(SexoProduto).map((v) => <SelectItem key={v} value={v}>{SEXO_PRODUTO_LABEL[v]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Embalagem *</Label>
              <Select value={form.embalagem || undefined} onValueChange={(v) => set('embalagem', v as EmbalagemProduto)}>
                <SelectTrigger aria-label="Embalagem"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(EmbalagemProduto).map((v) => <SelectItem key={v} value={v}>{EMBALAGEM_PRODUTO_LABEL[v]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select value={form.projeto || undefined} onValueChange={(v) => set('projeto', v as ProjetoCatalogo)}>
                <SelectTrigger aria-label="Projeto"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(ProjetoCatalogo).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prodFrench">French</Label>
              <Input id="prodFrench" inputMode="numeric" value={form.french} onChange={(e) => set('french', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prodCompr">Comprimento (cm)</Label>
              <Input id="prodCompr" inputMode="decimal" value={form.comprimentoCm} onChange={(e) => set('comprimentoCm', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="prodDesc">Descrição técnica *</Label>
              <Textarea id="prodDesc" rows={3} value={form.descricaoTecnica} onChange={(e) => set('descricaoTecnica', e.target.value)} />
            </div>
          </div>
          {sujo && erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button onClick={() => salvarMut.mutate()} disabled={!!erro || salvarMut.isPending}>
              {salvarMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={desativando !== null} onOpenChange={(aberto) => { if (!aberto) setDesativando(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Desativar produto?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{desativando?.nome}</strong> deixa de aparecer para a equipe escolher em novas entregas. Entregas já
            registradas continuam como estão.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesativando(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={desativarMut.isPending}
              onClick={() => desativando && desativarMut.mutate(desativando.codigo)}>
              {desativarMut.isPending ? 'Desativando…' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
