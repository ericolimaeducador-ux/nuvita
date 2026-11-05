import { useQuery } from '@tanstack/react-query';
import { clinicasApi } from '@/api/resources';

/** Dados da clínica do usuário (GET /clinicas/minha) para o timbre dos documentos. */
export function useClinicaMinha() {
  return useQuery({
    queryKey: ['clinica-minha'],
    queryFn: clinicasApi.minha,
    staleTime: 5 * 60 * 1000,
  });
}
