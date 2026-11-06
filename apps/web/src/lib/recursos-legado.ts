/**
 * R1 (decisões do Erico) — recursos herdados do psi DESATIVADOS na interface, sem apagar telas, código nem dados.
 * O servidor é quem bloqueia de fato (403); aqui só se escondem os controles para ninguém achar que algo funciona
 * ou foi bloqueado quando não foi. Tudo sai ou é redesenhado na etapa de conteúdo.
 */
export const RECURSOS_LEGADO = {
  /** Criar/editar/assinar/adendo no prontuário ANTIGO (o servidor responde 403: somente leitura). */
  escritaProntuarioAntigo: false,
  /** IA clínica antiga (sugerir abordagem, gerar prescrição; o servidor responde 403 "Recurso desativado."). */
  iaClinicaAntiga: false,
  /**
   * Ligar/desligar módulos por usuário: desativado até a etapa de conteúdo redesenhar a lista de módulos da
   * Estomaterapia e aplicar guard no servidor (hoje o servidor controla só pelo papel).
   */
  edicaoModulosPorUsuario: false,
} as const;
