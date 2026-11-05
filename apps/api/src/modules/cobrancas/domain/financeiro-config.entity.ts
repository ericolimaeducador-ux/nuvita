/**
 * Valor PADRÃO da consulta de enfermagem (cobrada na assinatura), usado só enquanto a clínica ainda não gravou o seu (editável por ADMIN/SUPER_ADMIN
 * em PUT /cobrancas/configuracao e guardado POR CLÍNICA). É o único lugar onde esse número existe no código.
 * R$ 220,00 = 22000 centavos.
 */
export const VALOR_CONSULTA_PADRAO_CENTAVOS = 22000;

export interface FinanceiroConfig {
  clinicaId: string;
  valorConsultaCentavos: number;
  atualizadoPor?: string;
  atualizadoEm?: Date;
}
