import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { superAdminApi } from '@/api/resources';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Skeleton } from '@/components/ui/skeleton';

const EVENTO_LABEL: Record<string, string> = {
  PASSWORD_RESET_REQUESTED: 'Pediu link',
  PASSWORD_RESET_COMPLETED: 'Redefiniu a senha',
  PASSWORD_RESET_FAILED: 'Link inválido/expirado',
  PASSWORD_RESET_BY_ADMIN: 'Senha redefinida pelo super-admin',
  TWO_FACTOR_RESET_BY_ADMIN: '2FA redefinido pelo super-admin',
};

const RESULTADO_LABEL: Record<string, string> = {
  ENVIADO: 'e-mail enviado',
  SUCESSO: 'sucesso',
  FALHA: 'falhou',
  FALHA_ENVIO: 'falha ao enviar o e-mail',
  LIMITE: 'bloqueado por limite',
  EMAIL_NAO_CADASTRADO: 'e-mail não cadastrado',
};

/** Quem pediu, concluiu ou está travado na recuperação de senha (autoatendimento e super-admin). */
export function RecuperacaoSenhaPainel() {
  const q = useQuery({ queryKey: ['recuperacao-senha'], queryFn: () => superAdminApi.recuperacaoSenha() });

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.isError) return <ErroConsulta erro={q.error} refetch={q.refetch} recurso="os pedidos de recuperação de senha" />;

  const eventos = q.data ?? [];
  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum pedido de recuperação de senha registrado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-2">Quando</th>
            <th className="p-2">E-mail</th>
            <th className="p-2">O que aconteceu</th>
            <th className="p-2">Caminho</th>
            <th className="p-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e, i) => (
            <tr key={`${e.quando}-${i}`} className="border-t border-border">
              <td className="p-2 whitespace-nowrap">{dayjs(e.quando).format('DD/MM/YYYY HH:mm')}</td>
              <td className="p-2">{e.email ?? '—'}</td>
              <td className="p-2">{EVENTO_LABEL[e.evento] ?? e.evento}</td>
              <td className="p-2">{e.caminho === 'SUPER_ADMIN' ? 'super-admin' : 'autoatendimento'}</td>
              <td className="p-2">{(e.resultado && RESULTADO_LABEL[e.resultado]) ?? e.resultado ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
