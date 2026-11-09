const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBranch, validateTable, validateProduct, validateSale } = require('../src/middlewares/validate');

function runValidation(middleware, body, params = {}) {
  const request = { body, params };
  let error;
  middleware(request, {}, (nextError) => { error = nextError; });
  return { request, error };
}

test('sucursal requiere nombre y normaliza campos de texto', () => {
  const { request, error } = runValidation(validateBranch, {
    nombre: '  Bola8 Centro  ', direccion: ' Calle 1 ', telefono: ' 777 '
  });
  assert.equal(error, undefined);
  assert.deepEqual(request.validatedBody, {
    nombre: 'Bola8 Centro', direccion: 'Calle 1', telefono: '777', estado: undefined
  });
});

test('sucursal rechaza nombre vacío', () => {
  const { error } = runValidation(validateBranch, { nombre: '  ' });
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('mesa rechaza tarifas no positivas y estados no permitidos', () => {
  const { error } = runValidation(validateTable, {
    numero_mesa: '1', tipo_mesa: 'Pool', tarifa_minuto: 0, id_sucursal: 1, estado: 'ocupada'
  });
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('producto acepta stock cero y rechaza fracciones', () => {
  const accepted = runValidation(validateProduct, {
    nombre: 'Agua', precio_venta: 4.5, stock: 0, id_sucursal: 1
  });
  assert.equal(accepted.error, undefined);
  const rejected = runValidation(validateProduct, {
    nombre: 'Agua', precio_venta: 4.5, stock: 1.5, id_sucursal: 1
  });
  assert.equal(rejected.error.code, 'VALIDATION_ERROR');
});

test('venta valida asociación mesa/venta directa y sus artículos', () => {
  const valid = runValidation(validateSale, {
    id_sucursal: 1, id_usuario: 2, tipo_venta: 'directa',
    items: [{ id_producto: 3, cantidad: 2 }]
  });
  assert.equal(valid.error, undefined);
  const invalid = runValidation(validateSale, {
    id_sucursal: 1, id_usuario: 2, tipo_venta: 'mesa',
    items: [{ id_producto: 3, cantidad: 2 }]
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');
});
