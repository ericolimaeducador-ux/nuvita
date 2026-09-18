/**
 * feature-consultation-reminder-scheduler — corpo de resposta de
 * POST /internal/processar-lembretes. Campos espelham o log estruturado
 * descrito na seção Monitoring do design doc (attempted/sent/deduped/failed).
 * Nesta fase o corpo é sempre zerado (stub) — a lógica real usando
 * listarParaLembrete() + NotificacoesService.create() é a fase seguinte.
 */
export class ProcessarLembretesResponseDto {
  attempted!: number;
  sent!: number;
  deduped!: number;
  failed!: number;
}
