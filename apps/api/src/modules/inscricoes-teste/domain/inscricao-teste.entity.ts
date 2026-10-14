export enum InscricaoTesteStatus {
  /** Recebida, ainda sem decisão do SUPER_ADMIN. */
  INSCRITA = 'INSCRITA',
  /** Escolhida para uma das vagas do teste. */
  CONFIRMADA = 'CONFIRMADA',
  LISTA_DE_ESPERA = 'LISTA_DE_ESPERA',
  CANCELADA = 'CANCELADA',
}

export class InscricaoTeste {
  id!: string;
  nome!: string;
  email!: string;
  whatsapp!: string;
  crpNumero!: string;
  cidadeEstado!: string;
  modoAtendimento!: string;
  ferramentaAtual?: string;
  maiorDor?: string;
  termoVersao!: string;
  aceiteTermoEm!: Date;
  aceiteIp!: string;
  status!: InscricaoTesteStatus;
  criadoEm!: Date;
}
