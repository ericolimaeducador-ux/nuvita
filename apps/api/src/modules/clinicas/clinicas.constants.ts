export const CLINICA_REPOSITORY = Symbol('CLINICA_REPOSITORY');

/** Logo da clínica: só PNG/JPG (sem SVG), até 2 MB; GET presignado de 15 min (cobre o cache de 5 min do web). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_READ_URL_TTL_SECONDS = 15 * 60;
export const LOGO_MIME_EXTENSAO: Readonly<Record<string, 'png' | 'jpg'>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
