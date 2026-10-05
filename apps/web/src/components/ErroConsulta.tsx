import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMensagemErro } from '@/lib/consulta';

/**
 * Falha explícita de uma consulta: erro nunca pode parecer "sem dados". 403 não oferece nova
 * tentativa (repetir não muda a permissão); 5xx/rede oferecem, se `refetch` for informado.
 */
export function ErroConsulta({
  erro,
  refetch,
  recurso,
  className,
}: {
  erro: unknown;
  refetch?: () => unknown;
  /** Complemento da frase "Não foi possível carregar …" (ex.: "os atendimentos"). */
  recurso?: string;
  className?: string;
}) {
  const { mensagem, podeTentarNovamente } = useMensagemErro(erro, recurso);
  return (
    <div
      role="alert"
      data-testid="erro-consulta"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive',
        className,
      )}
    >
      <p>{mensagem}</p>
      {podeTentarNovamente && refetch && (
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
