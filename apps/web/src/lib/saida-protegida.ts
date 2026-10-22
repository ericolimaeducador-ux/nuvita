import type { ComponentProps } from 'react';
import type { DialogContent } from '@/components/ui/dialog';

type ContentProps = Pick<ComponentProps<typeof DialogContent>, 'onInteractOutside' | 'onEscapeKeyDown'>;

/**
 * Proteção OPT-IN para diálogos com texto livre: clique fora e ESC nunca fecham; só Salvar ou Cancelar.
 * Cancelar (e o X) com alterações pendentes pede "Descartar alterações?" antes de fechar.
 * Mesmo padrão do RegistroSessaoDialog (AtendimentoPsicologicoPage). Não use em diálogos de confirmação.
 *
 * - `sujo`: o formulário tem algo digitado/alterado.
 * - `aoFechar`: fecha o diálogo e descarta o rascunho (reset do form/estado).
 */
export function useSaidaProtegida(sujo: boolean, aoFechar: () => void) {
  const solicitarFechar = () => {
    if (sujo && !window.confirm('Descartar alterações?')) return;
    aoFechar();
  };
  const contentProps: ContentProps = {
    onInteractOutside: (e) => e.preventDefault(),
    onEscapeKeyDown: (e) => e.preventDefault(),
  };
  return {
    /** Para `<Dialog onOpenChange>`: o X do DialogContent passa por aqui. */
    onOpenChange: (aberto: boolean) => { if (!aberto) solicitarFechar(); },
    /** Para o botão Cancelar. */
    solicitarFechar,
    /** Espalhar em `<DialogContent {...contentProps}>`. */
    contentProps,
  };
}
