export const DOCUMENTO_REPOSITORY = Symbol('DOCUMENTO_REPOSITORY');

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PATIENT_STORAGE_BYTES = 500 * 1024 * 1024;
export const DOCUMENT_ACCESS_URL_TTL_SECONDS = 15 * 60;
// Registros criados no presign e nunca confirmados são removidos (soft-delete) após este prazo.
export const DOCUMENTO_NAO_CONFIRMADO_TTL_MS = 24 * 60 * 60 * 1000;
