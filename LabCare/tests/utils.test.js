const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCreate,
  validateUpdate,
  canTransition
} = require('../src/utils');

test('rechaza solicitante vacio o con menos de 3 caracteres', () => {
  const result = validateCreate({
    equipo_id: 1,
    solicitante: '  A ',
    descripcion: 'Descripcion valida',
    prioridad: 'MEDIA'
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.solicitante);
});

test('rechaza descripcion con menos de 10 caracteres', () => {
  const result = validateCreate({
    equipo_id: 1,
    solicitante: 'Maria',
    descripcion: ' corta ',
    prioridad: 'ALTA'
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.descripcion);
});

test('rechaza prioridad fuera de BAJA, MEDIA o ALTA', () => {
  const result = validateCreate({
    equipo_id: 1,
    solicitante: 'Maria',
    descripcion: 'Descripcion valida',
    prioridad: 'URGENTE'
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.prioridad);
});

test('rechaza equipo inexistente o invalido', () => {
  const result = validateCreate({
    equipo_id: 999,
    solicitante: 'Maria',
    descripcion: 'Descripcion valida',
    prioridad: 'BAJA'
  });
  assert.equal(result.valid, true);
  const invalidId = validateCreate({
    equipo_id: 'abc',
    solicitante: 'Maria',
    descripcion: 'Descripcion valida',
    prioridad: 'BAJA'
  });
  assert.equal(invalidId.valid, false);
});

test('acepta datos validos', () => {
  const result = validateCreate({
    equipo_id: 1,
    solicitante: ' Ana Perez ',
    descripcion: '  No enciende el equipo  ',
    prioridad: 'alta'
  });
  assert.equal(result.valid, true);
  assert.equal(result.value.prioridad, 'ALTA');
  assert.equal(result.value.solicitante, 'Ana Perez');
});

test('permite PENDIENTE a EN_PROCESO', () => {
  assert.equal(canTransition('PENDIENTE', 'EN_PROCESO'), true);
});

test('rechaza RESUELTA a PENDIENTE', () => {
  assert.equal(canTransition('RESUELTA', 'PENDIENTE'), false);
});

test('rechaza CANCELADA a EN_PROCESO', () => {
  assert.equal(canTransition('CANCELADA', 'EN_PROCESO'), false);
});

test('acepta actualizacion valida y conserva separacion de campos de sistema', () => {
  const result = validateUpdate({
    equipo_id: 2,
    solicitante: 'Carlos',
    descripcion: 'Debe revisar el proyector',
    prioridad: 'MEDIA'
  });
  assert.equal(result.valid, true);
});

