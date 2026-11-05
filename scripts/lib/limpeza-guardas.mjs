/**
 * Pure guards for the second cleanup of the test clinics (no database access, unit-tested).
 * The script refuses to run when any guard fails; it never "fixes" the list by itself.
 */
const HEX24 = /^[0-9a-f]{24}$/i;

/** Collections scoped by `clinicaId`, children first. `pacientes` is last because the others reference it. */
export const COLECOES_POR_CLINICA = [
  'agendamentos',
  'bloqueios_agenda',
  'prontuarios',
  'documentos',
  'documentos_emitidos',
  'config_psicologo',
  'lancamentos_financeiros',
  'decisoes_uso_ia',
  'registros_uso_ia',
  'notificacoes',
  'notificacao_preferencias',
  'observacoes_paciente',
  'eventos_telemedicina',
  'salas_telemedicina',
  'testes_psicologicos',
  'tickets',
  'pacientes',
];

/** Never touched, by design: audit trail, beta sign-ups, the Gerenciadora clinic. */
export const COLECOES_PRESERVADAS = ['audit_logs', 'inscricoes_teste'];
export const NOME_CLINICA_PRESERVADA = 'Gerenciadora';
export const PAPEL_PRESERVADO = 'SUPER_ADMIN';

export function lerLista(bruto) {
  const erros = [];
  const ids = (campo) => {
    const lista = bruto?.[campo];
    if (!Array.isArray(lista) || lista.length === 0) {
      erros.push(`"${campo}" is empty or missing: the script refuses an empty list.`);
      return [];
    }
    const invalidos = lista.filter((id) => typeof id !== 'string' || !HEX24.test(id));
    if (invalidos.length) erros.push(`"${campo}" has ${invalidos.length} id(s) that are not 24 hex characters.`);
    return [...new Set(lista.filter((id) => typeof id === 'string').map((id) => id.toLowerCase()))];
  };
  return { clinicas: ids('clinicas'), usuarios: ids('usuarios'), erros };
}

/**
 * @param lista {clinicas: string[], usuarios: string[]} (hex ids)
 * @param encontrados {clinicas: {_id, nome}[], usuarios: {_id, papel, clinicaId}[], usuariosDasClinicas: same shape}
 *   `usuariosDasClinicas` = every user whose clinicaId (string OR ObjectId) is one of the listed clinics.
 * @returns string[] reasons to refuse (empty = may proceed)
 */
export function validarLista(lista, encontrados) {
  const erros = [...(lista.erros ?? [])];
  const id = (v) => String(v).toLowerCase();
  const clinicasLista = new Set(lista.clinicas);
  const usuariosLista = new Set(lista.usuarios);

  for (const cid of lista.clinicas) {
    if (!encontrados.clinicas.some((c) => id(c._id) === cid)) erros.push(`Clinic ${cid} was not found.`);
  }
  for (const c of encontrados.clinicas) {
    if (c.nome === NOME_CLINICA_PRESERVADA) erros.push(`Clinic ${id(c._id)} is "${NOME_CLINICA_PRESERVADA}": it must be preserved.`);
  }
  for (const uid of lista.usuarios) {
    const u = encontrados.usuarios.find((x) => id(x._id) === uid);
    if (!u) erros.push(`User ${uid} was not found.`);
    else if (u.papel === PAPEL_PRESERVADO) erros.push(`User ${uid} is ${PAPEL_PRESERVADO}: the script refuses it.`);
    else if (!clinicasLista.has(id(u.clinicaId ?? ''))) erros.push(`User ${uid} does not belong to any listed clinic.`);
  }
  for (const u of encontrados.usuariosDasClinicas) {
    if (u.papel === PAPEL_PRESERVADO) erros.push(`A ${PAPEL_PRESERVADO} belongs to a listed clinic (${id(u._id)}): the script refuses.`);
    else if (!usuariosLista.has(id(u._id))) erros.push(`User ${id(u._id)} belongs to a listed clinic but is NOT in the user list: unexpected, stop.`);
  }
  return erros;
}
