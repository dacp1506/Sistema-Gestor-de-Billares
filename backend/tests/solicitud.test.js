const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateSolicitudCreate,
  validateSolicitudUpdate,
  validateSolicitudStatus
} = require('../src/middlewares/validate');
const { canTransition, nextStates } = require('../src/domain/solicitud');

function runValidation(middleware, body, method = 'POST') {
  const request = { body, params: {}, method };
  let error;
  middleware(request, {}, (nextError) => { error = nextError; });
  return { request, error };
}

test('solicitud valida y normaliza datos correctos', () => {
  const { request, error } = runValidation(validateSolicitudCreate, {
    id_equipo: 2,
    solicitante: '  Ana Pérez  ',
    descripcion: '  La mesa 1 tiene una banda suelta  ',
    prioridad: 'alta'
  });

  assert.equal(error, undefined);
  assert.deepEqual(request.validatedBody, {
    id_equipo: 2,
    solicitante: 'Ana Pérez',
    descripcion: 'La mesa 1 tiene una banda suelta',
    prioridad: 'ALTA'
  });
});

test('solicitud rechaza solicitante con menos de 3 caracteres después del trim', () => {
  const { error } = runValidation(validateSolicitudCreate, {
    id_equipo: 1,
    solicitante: '  A  ',
    descripcion: 'Descripción suficientemente larga',
    prioridad: 'MEDIA'
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.match(error.message, /solicitante/);
});

test('solicitud rechaza descripción con menos de 10 caracteres después del trim', () => {
  const { error } = runValidation(validateSolicitudUpdate, {
    id_equipo: 1,
    solicitante: 'Carlos',
    descripcion: '  corta  ',
    prioridad: 'BAJA'
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.match(error.message, /descripcion/);
});

test('solicitud rechaza prioridad distinta de BAJA, MEDIA o ALTA', () => {
  const { error } = runValidation(validateSolicitudCreate, {
    id_equipo: 1,
    solicitante: 'Carlos',
    descripcion: 'Descripción suficientemente larga',
    prioridad: 'URGENTE'
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.match(error.message, /prioridad/);
});

test('solicitud rechaza equipo inválido y acepta identificador numérico en texto', () => {
  const invalid = runValidation(validateSolicitudCreate, {
    id_equipo: 'abc',
    solicitante: 'Carlos',
    descripcion: 'Descripción suficientemente larga',
    prioridad: 'BAJA'
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');

  const valid = runValidation(validateSolicitudCreate, {
    id_equipo: '4',
    solicitante: 'Carlos',
    descripcion: 'Descripción suficientemente larga',
    prioridad: 'BAJA'
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.request.validatedBody.id_equipo, 4);
});

test('cambio de estado acepta minúsculas y rechaza estados desconocidos', () => {
  const accepted = runValidation(validateSolicitudStatus, { estado: 'en_proceso' }, 'PATCH');
  assert.equal(accepted.error, undefined);
  assert.deepEqual(accepted.request.validatedBody, { estado: 'EN_PROCESO' });

  const rejected = runValidation(validateSolicitudStatus, { estado: 'FINALIZADA' }, 'PATCH');
  assert.equal(rejected.error.code, 'VALIDATION_ERROR');
});

test('flujo de estados respeta las transiciones del examen', () => {
  assert.equal(canTransition('PENDIENTE', 'EN_PROCESO'), true);
  assert.equal(canTransition('PENDIENTE', 'CANCELADA'), true);
  assert.equal(canTransition('EN_PROCESO', 'RESUELTA'), true);
  assert.equal(canTransition('EN_PROCESO', 'CANCELADA'), true);

  assert.equal(canTransition('RESUELTA', 'PENDIENTE'), false);
  assert.equal(canTransition('RESUELTA', 'EN_PROCESO'), false);
  assert.equal(canTransition('CANCELADA', 'PENDIENTE'), false);
  assert.equal(canTransition('CANCELADA', 'EN_PROCESO'), false);
  assert.equal(canTransition('PENDIENTE', 'RESUELTA'), false);
  assert.equal(canTransition('DESCONOCIDO', 'PENDIENTE'), false);

  assert.deepEqual(nextStates('PENDIENTE'), ['EN_PROCESO', 'CANCELADA']);
  assert.deepEqual(nextStates('RESUELTA'), []);
});
