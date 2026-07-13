import { useParams } from 'react-router-dom';
import { SalaVideo } from '@/components/SalaVideo';

/**
 * Página pública da sala de atendimento — o token UUID do link é a credencial
 * (o paciente entra sem login). A chamada em si vive em `SalaVideo`, que o
 * psicólogo também usa embutida, com o prontuário ao lado.
 */
export function AtendimentoTelemedicinaPage() {
  const { token = '' } = useParams();
  return <SalaVideo token={token} />;
}
