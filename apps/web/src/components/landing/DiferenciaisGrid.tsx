import { Clock, DatabaseBackup, Globe, Headset, LockKeyhole, ShieldCheck, type LucideIcon } from 'lucide-react';

const itens: { icone: LucideIcon; titulo: string; texto: string }[] = [
  { icone: LockKeyhole, titulo: 'Dados protegidos', texto: 'Informações armazenadas com criptografia.' },
  { icone: ShieldCheck, titulo: 'Conformidade com a LGPD', texto: 'Tratamento de dados alinhado à Lei Geral de Proteção de Dados.' },
  { icone: DatabaseBackup, titulo: 'Backup automatizado', texto: 'Seus dados com cópia de segurança, sem você precisar lembrar.' },
  { icone: Headset, titulo: 'Suporte em português', texto: 'Atendimento na sua língua, para tirar dúvidas do dia a dia.' },
  { icone: Globe, titulo: 'Direto no navegador', texto: 'Acesse pela internet, sem instalar nada.' },
  { icone: Clock, titulo: 'Ativação em até 24h úteis', texto: 'Acesso liberado após a confirmação do pagamento.' },
];

export function DiferenciaisGrid() {
  return (
    <section aria-labelledby="diferenciais-titulo" className="border-b border-sage/40 bg-quente px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 id="diferenciais-titulo" className="max-w-xl font-display text-4xl font-medium leading-tight text-petroleo sm:text-5xl">
          Feito para o seu consultório
        </h2>
        <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex gap-4">
              <Icone className="mt-0.5 h-7 w-7 shrink-0 text-petroleo-medio" strokeWidth={1.4} aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-ink">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
