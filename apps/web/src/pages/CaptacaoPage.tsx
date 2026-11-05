import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import {
  CAPTACAO_FORM_VAZIO,
  FormularioCaptacao,
  type CaptacaoFormValues,
  type CodigoEnfermeiroCaptador,
} from '@/components/FormularioCaptacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Em dev fica vazio e o proxy do Vite encaminha /captacao. Em produção o site
// está no GitHub Pages, sem proxy, então a chamada vai para a API pública.
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const PIN_KEY = 'nuvita.captacao.pin';
const FORM_KEY = 'nuvita.captacao.rascunho';
const SESSAO_KEY = 'nuvita.captacao.sessao';

type StatusMsg = { tipo: 'sucesso' | 'erro'; texto: string } | null;
type RegistroSessao = { nome: string; codigo: string; hora: string };

function mensagemApi(body: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(body.message)) return body.message.join(' ');
  if (typeof body.message === 'string' && body.message) return body.message;
  return fallback;
}

function lerSessao(): RegistroSessao[] {
  try {
    const raw = sessionStorage.getItem(SESSAO_KEY);
    const lista = raw ? JSON.parse(raw) as RegistroSessao[] : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function lerRascunho(): CaptacaoFormValues {
  try {
    const raw = sessionStorage.getItem(FORM_KEY);
    if (!raw) return { ...CAPTACAO_FORM_VAZIO };
    const salvo = JSON.parse(raw) as Partial<CaptacaoFormValues>;
    return { ...CAPTACAO_FORM_VAZIO, ...salvo };
  } catch {
    return { ...CAPTACAO_FORM_VAZIO };
  }
}

export function CaptacaoPage() {
  const nomeRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState(() => sessionStorage.getItem(PIN_KEY) ?? '');
  const [autenticado, setAutenticado] = useState(() => (sessionStorage.getItem(PIN_KEY) ?? '').trim().length >= 4);
  const [carregando, setCarregando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>(null);
  const [formData, setFormData] = useState<CaptacaoFormValues>(lerRascunho);
  const [sessao, setSessao] = useState<RegistroSessao[]>(lerSessao);

  useEffect(() => {
    document.title = 'Captação de Pacientes | Nuvita';
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    sessionStorage.setItem(FORM_KEY, JSON.stringify(formData));
  }, [autenticado, formData]);

  useEffect(() => {
    if (autenticado) nomeRef.current?.focus();
  }, [autenticado]);

  function entrar(e: FormEvent) {
    e.preventDefault();
    const informado = pin.trim();
    if (informado.length < 4) {
      setStatusMsg({ tipo: 'erro', texto: 'Informe o PIN de acesso.' });
      return;
    }
    sessionStorage.setItem(PIN_KEY, informado);
    setPin(informado);
    setStatusMsg(null);
    setAutenticado(true);
  }

  function sair() {
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(FORM_KEY);
    setPin('');
    setAutenticado(false);
    setStatusMsg(null);
    setFormData({ ...CAPTACAO_FORM_VAZIO });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setStatusMsg(null);

    try {
      const response = await fetch(`${API_URL}/captacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-captador-pin': pin,
        },
        body: JSON.stringify(Object.fromEntries(
          Object.entries(formData).map(([key, value]) => [key, value.trim() || undefined]),
        )),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string | string[] };

      if (response.status === 401) {
        sessionStorage.removeItem(PIN_KEY);
        setAutenticado(false);
        setStatusMsg({ tipo: 'erro', texto: mensagemApi(result, 'PIN inválido.') });
        return;
      }

      if (response.status === 429) {
        setStatusMsg({ tipo: 'erro', texto: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });
        return;
      }

      if (!response.ok) {
        setStatusMsg({
          tipo: 'erro',
          texto: mensagemApi(result, 'Não foi possível registrar a captação. Confira os dados e tente de novo.'),
        });
        return;
      }

      const registro: RegistroSessao = {
        nome: formData.nome.trim() || 'Interessado sem nome',
        codigo: formData.codigoEnfermeiro,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      const proxima = [registro, ...sessao].slice(0, 12);
      setSessao(proxima);
      sessionStorage.setItem(SESSAO_KEY, JSON.stringify(proxima));
      setStatusMsg({ tipo: 'sucesso', texto: `${registro.nome} entrou na fila de captação.` });
      setFormData({
        ...CAPTACAO_FORM_VAZIO,
        codigoEnfermeiro: formData.codigoEnfermeiro as CodigoEnfermeiroCaptador,
      });
      nomeRef.current?.focus();
    } catch {
      setStatusMsg({ tipo: 'erro', texto: 'Sem comunicação com o servidor. Verifique se o Nuvita está no ar e tente de novo.' });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      <aside className="flex shrink-0 items-center justify-between bg-brand-cobalt px-4 py-3 text-white lg:w-60 lg:flex-col lg:items-stretch lg:px-0 lg:py-0">
        <div className="flex h-11 items-center lg:h-[68px] lg:border-b lg:border-white/10 lg:px-4">
          <Logo width={140} iconColor="#FFB800" textColor="#FFFFFF" />
        </div>
        <div className="hidden flex-1 px-4 py-6 lg:block">
          <p className="text-sm font-semibold">Captação de Pacientes</p>
          <p className="mt-2 text-xs leading-relaxed text-blue-100/80">
            Posto do enfermeiro captador. Cada cadastro fica na fila até a clínica enviar ao prontuário.
          </p>
          {autenticado && (
            <p className="mt-6 text-xs text-blue-100/80">
              Código em uso
              <span className="mt-1 block text-sm font-semibold text-white">{formData.codigoEnfermeiro}</span>
            </p>
          )}
        </div>
        {autenticado && (
          <div className="lg:border-t lg:border-white/10 lg:p-3">
            <p className="mb-2 text-xs text-blue-100 lg:hidden">{formData.codigoEnfermeiro}</p>
            <Button
              type="button"
              variant="ghost"
              className="text-blue-100 hover:bg-white/10 hover:text-white lg:w-full"
              onClick={sair}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
              <span className="hidden lg:inline">&nbsp;do posto</span>
            </Button>
          </div>
        )}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center border-b border-border bg-card px-4 py-4 lg:h-[68px] lg:px-8 lg:py-0">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {autenticado ? 'Novo interessado' : 'Acesso do enfermeiro'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {autenticado
                ? 'Preencha e confirme. O formulário fica pronto para o próximo paciente.'
                : 'Informe o PIN para abrir o posto de captação neste computador.'}
            </p>
          </div>
        </header>

        {!autenticado ? (
          <div className="flex flex-1 items-center justify-center p-4 lg:p-8">
            <form onSubmit={entrar} className="w-full max-w-sm space-y-4">
              {statusMsg && <Aviso msg={statusMsg} />}
              <div className="space-y-1.5">
                <Label htmlFor="pin">PIN de acesso</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Informe seu PIN"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full">Entrar no posto</Button>
            </form>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-y-auto p-4 lg:p-8">
              <div className="mx-auto max-w-3xl">
                <FormularioCaptacao
                  values={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  carregando={carregando}
                  nomeRef={nomeRef}
                  aviso={statusMsg ? <Aviso msg={statusMsg} /> : undefined}
                />
              </div>
            </section>
            <aside className="max-h-52 overflow-y-auto border-t border-border bg-card p-4 lg:max-h-none lg:border-l lg:border-t-0 lg:p-5">
              <h2 className="text-sm font-semibold text-foreground">Neste computador</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastros desta sessão. A clínica vê a fila completa no painel.
              </p>
              {sessao.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Nenhum paciente cadastrado ainda nesta sessão.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {sessao.map((item, i) => (
                    <li key={`${item.hora}-${item.nome}-${i}`} className="border-b border-border pb-3">
                      <p className="text-sm font-medium text-foreground">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">{item.codigo} · {item.hora}</p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Aviso({ msg }: { msg: { tipo: 'sucesso' | 'erro'; texto: string } }) {
  return (
    <div
      className={
        msg.tipo === 'sucesso'
          ? 'rounded-md border border-brand-cobalt/20 bg-brand-cobalt/10 px-3 py-2 text-sm text-foreground'
          : 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
      }
      role="status"
    >
      {msg.texto}
    </div>
  );
}
