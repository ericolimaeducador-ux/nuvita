import test from 'node:test';
import assert from 'node:assert/strict';
import { lerLista, validarLista } from './limpeza-guardas.mjs';

const C1 = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const U1 = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const U2 = 'cccccccccccccccccccccccc';
const base = () => ({
  lista: lerLista({ clinicas: [C1], usuarios: [U1, U2] }),
  encontrados: {
    clinicas: [{ _id: C1, nome: 'Clinica fictícia' }],
    usuarios: [{ _id: U1, papel: 'ADMIN', clinicaId: C1 }, { _id: U2, papel: 'ENFERMEIRO', clinicaId: C1 }],
    usuariosDasClinicas: [{ _id: U1, papel: 'ADMIN' }, { _id: U2, papel: 'ENFERMEIRO' }],
  },
});

test('consistent list passes', () => {
  const { lista, encontrados } = base();
  assert.deepEqual(validarLista(lista, encontrados), []);
});
test('empty clinic list is refused', () => {
  assert.ok(lerLista({ clinicas: [], usuarios: [U1] }).erros.length > 0);
});
test('empty user list is refused', () => {
  assert.ok(lerLista({ clinicas: [C1], usuarios: [] }).erros.length > 0);
});
test('malformed id is refused', () => {
  assert.ok(lerLista({ clinicas: ['x'], usuarios: [U1] }).erros.length > 0);
});
test('a SUPER_ADMIN in the user list is refused', () => {
  const { lista, encontrados } = base();
  encontrados.usuarios[0].papel = 'SUPER_ADMIN';
  assert.ok(validarLista(lista, encontrados).some((e) => e.includes('SUPER_ADMIN')));
});
test('a SUPER_ADMIN living in a listed clinic is refused', () => {
  const { lista, encontrados } = base();
  encontrados.usuariosDasClinicas.push({ _id: 'dddddddddddddddddddddddd', papel: 'SUPER_ADMIN' });
  assert.ok(validarLista(lista, encontrados).some((e) => e.includes('SUPER_ADMIN')));
});
test('the Gerenciadora clinic is refused', () => {
  const { lista, encontrados } = base();
  encontrados.clinicas[0].nome = 'Gerenciadora';
  assert.ok(validarLista(lista, encontrados).some((e) => e.includes('Gerenciadora')));
});
test('a user of a listed clinic that is not in the list stops the run', () => {
  const { lista, encontrados } = base();
  encontrados.usuariosDasClinicas.push({ _id: 'eeeeeeeeeeeeeeeeeeeeeeee', papel: 'ENFERMEIRO' });
  assert.ok(validarLista(lista, encontrados).some((e) => e.includes('NOT in the user list')));
});
test('unknown clinic or user is refused', () => {
  const { lista, encontrados } = base();
  encontrados.clinicas = [];
  encontrados.usuarios = [];
  assert.ok(validarLista(lista, encontrados).length >= 3);
});
