// Regras da logo da clínica no cliente. O servidor continua sendo o gate real (422): isto só evita um
// round-trip e dá mensagem clara. Deve espelhar LOGO_MAX_BYTES / LOGO_MIME_EXTENSAO do backend.
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TIPOS_ACEITOS = ['image/png', 'image/jpeg'] as const;

/** Mensagem de erro se o arquivo não serve como logo; null se pode seguir. */
export function validarArquivoLogo(file: { type: string; size: number }): string | null {
  if (!(LOGO_TIPOS_ACEITOS as readonly string[]).includes(file.type)) {
    return 'Use uma imagem PNG ou JPG.';
  }
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > LOGO_MAX_BYTES) return 'A logo deve ter até 2 MB. Reduza o arquivo e tente de novo.';
  return null;
}
