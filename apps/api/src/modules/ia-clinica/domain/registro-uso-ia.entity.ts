import { TipoUsoIA } from './registro-uso-ia.enum';

/**
 * Registro imutável de uma geração de sugestão pela IA clínica. `input*` e
 * `output*` guardam o payload da requisição e a resposta da IA cifrados
 * (AES-256-GCM) com a chave dedicada IA_USO_ENCRYPTION_KEY.
 */
export interface RegistroUsoIa {
  id: string;
  clinicaId: string;
  usuarioId: string;
  tipo: TipoUsoIA;
  modelo: string;
  inputCifrado: string;
  inputIv: string;
  inputAuthTag: string;
  outputCifrado: string;
  outputIv: string;
  outputAuthTag: string;
  criadoEm: Date;
}
