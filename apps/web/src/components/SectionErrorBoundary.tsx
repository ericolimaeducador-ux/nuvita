import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  /** Nome da seção, usado na mensagem ao usuário (ex.: "Dados cadastrais"). */
  secao: string;
  children: ReactNode;
}

interface State {
  falhou: boolean;
}

/**
 * Isola uma subárvore: se ela quebrar na renderização, só ela é substituída por
 * uma mensagem — o restante da página continua utilizável. Nada do erro
 * (mensagem, stack) é exposto ao usuário; o detalhe vai para o console.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false };

  static getDerivedStateFromError(): State {
    return { falhou: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary] falha em "${this.props.secao}"`, error, info.componentStack);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <div
        role="alert"
        data-testid="section-error"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Não foi possível exibir "{this.props.secao}". Recarregue a página; se persistir, contate o suporte.
          O restante do cadastro do paciente continua disponível.
        </span>
      </div>
    );
  }
}
