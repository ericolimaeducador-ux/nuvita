export interface TestePsicologico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nomeTeste: string;
  dataAplicacao: Date;
  resultado?: string;
  aplicadoPor: string;
  criadoEm: Date;
}
