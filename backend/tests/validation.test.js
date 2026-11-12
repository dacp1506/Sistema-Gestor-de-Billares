const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBranch, validateTable, validateProduct, validateSale, validateStartSession, validateCashOpen, validateCashClose, validateReservation, validateReservationStatus, validateLogin, validateRegistration, validateUser, validateSettings } = require('../src/middlewares/validate');

function runValidation(middleware, body, params = {}, method = 'POST') {
  const request = { body, params, method };
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
  assert.deepEqual(valid.request.validatedBody, {
    id_sucursal: 1,
    id_usuario: 2,
    id_sesion: null,
    tipo_venta: 'directa',
    items: [{ id_producto: 3, cantidad: 2 }],
  });
  const invalid = runValidation(validateSale, {
    id_sucursal: 1, id_usuario: 2, tipo_venta: 'mesa',
    items: [{ id_producto: 3, cantidad: 2 }]
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');
});

test('sesión requiere id_mesa e id_usuario válidos', () => {
  const valid = runValidation(validateStartSession, { id_mesa: 7, id_usuario: 4 });
  assert.equal(valid.error, undefined);

  const invalid = runValidation(validateStartSession, { id_mesa: 0, id_usuario: 4 });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');
});

test('apertura y cierre de caja validan monto e identificadores', () => {
  const validOpen = runValidation(validateCashOpen, {
    id_sucursal: 1,
    id_usuario: 2,
    monto_inicial: 250
  });
  assert.equal(validOpen.error, undefined);
  assert.equal(validOpen.request.validatedBody.monto_inicial, 250);

  const invalidOpen = runValidation(validateCashOpen, {
    id_sucursal: 1,
    id_usuario: 0,
    monto_inicial: -5
  });
  assert.equal(invalidOpen.error.code, 'VALIDATION_ERROR');

  const validClose = runValidation(validateCashClose, { monto_declarado: 180 });
  assert.equal(validClose.error, undefined);

  const invalidClose = runValidation(validateCashClose, { monto_declarado: -1 });
  assert.equal(invalidClose.error.code, 'VALIDATION_ERROR');
});

test('reserva valida datos de cliente, mesa y estado', () => {
  const valid = runValidation(validateReservation, {
    nombre_cliente: 'Luis',
    telefono_cliente: '70012345',
    fecha_reserva: '2026-11-12',
    hora_inicio: '19:30',
    duracion_minutos: 90,
    id_mesa: 6,
    estado: 'confirmada'
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.request.validatedBody.estado, 'confirmada');

  const invalid = runValidation(validateReservation, {
    nombre_cliente: '  ',
    telefono_cliente: '70012345',
    fecha_reserva: '2026/11/12',
    hora_inicio: '25:00',
    duracion_minutos: 0,
    id_mesa: 0
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');

  const status = runValidation(validateReservationStatus, { estado: 'cancelada' });
  assert.equal(status.error, undefined);
});

test('login valida credenciales mínimas', () => {
  const valid = runValidation(validateLogin, {
    identifier: 'Juan.Perez',
    password: '123456'
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.request.validatedBody.identifier, 'juan.perez');

  const invalid = runValidation(validateLogin, {
    identifier: '',
    password: '123'
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');
});

test('registro valida los datos del primer administrador general', () => {
  const valid = runValidation(validateRegistration, {
    nombre: '  Ana Bola8 ',
    email: ' ANA@BOLA8.COM ',
    password: 'una clave segura',
  });
  assert.equal(valid.error, undefined);
  assert.deepEqual(valid.request.validatedBody, {
    nombre: 'Ana Bola8',
    email: 'ana@bola8.com',
    password: 'una clave segura',
  });

  const invalid = runValidation(validateRegistration, {
    nombre: 'Ana',
    email: 'no-es-email',
    password: 'corta',
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');
});

test('usuario valida rol y asignación de sucursal', () => {
  const valid = runValidation(validateUser, {
    nombre: 'Ana',
    username: 'Ana.Salas',
    password: 'una clave segura',
    rol: 'cajero',
    id_sucursal: 3,
    activo: true
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.request.validatedBody.username, 'ana.salas');
  assert.equal(valid.request.validatedBody.id_sucursal, 3);

  const staffWithBlankEmail = runValidation(validateUser, {
    nombre: 'Ana',
    username: 'ana.salas',
    email: '',
    password: 'una clave segura',
    rol: 'cajero',
    id_sucursal: 3
  });
  assert.equal(staffWithBlankEmail.error, undefined);
  assert.equal(staffWithBlankEmail.request.validatedBody.email, null);

  const invalid = runValidation(validateUser, {
    nombre: 'Ana',
    email: 'correo',
    password: 'corta',
    rol: 'admin_general',
    id_sucursal: 1
  });
  assert.equal(invalid.error.code, 'VALIDATION_ERROR');

  const admin = runValidation(validateUser, {
    nombre: 'Admin',
    email: 'admin@bola8.com',
    password: 'una clave segura',
    rol: 'admin_general',
    id_sucursal: null
  });
  assert.equal(admin.error, undefined);
  assert.equal(admin.request.validatedBody.email, 'admin@bola8.com');

  const staffEmail = runValidation(validateUser, {
    nombre: 'Ana',
    username: 'ana.salas',
    email: 'ana@example.com',
    password: 'una clave segura',
    rol: 'cajero',
    id_sucursal: 3
  });
  assert.equal(staffEmail.error.code, 'VALIDATION_ERROR');

  const shortPassword = runValidation(validateUser, {
    nombre: 'Ana',
    username: 'ana',
    password: 'corta',
    rol: 'cajero',
    id_sucursal: 3,
  });
  assert.equal(shortPassword.error.code, 'VALIDATION_ERROR');
  assert.match(shortPassword.error.message, /12 y 255/);

  const partialUpdate = runValidation(validateUser, { activo: false }, {}, 'PUT');
  assert.equal(partialUpdate.error, undefined);
  assert.deepEqual(partialUpdate.request.validatedBody, { activo: false });
});

test('configuración valida tema, idioma, moneda, IVA y formato de impresión', () => {
  const valid = runValidation(validateSettings, {
    tema: 'dark',
    idioma: 'es',
    moneda: 'BOB',
    nombre_comercial: '  SALÓN DE BILLAR BOLA8  ',
    iva_porcentaje: 13,
    formato_impresion: '80mm',
  }, {}, 'PUT');
  assert.equal(valid.error, undefined);
  assert.equal(valid.request.validatedBody.nombre_comercial, 'SALÓN DE BILLAR BOLA8');
  assert.equal(valid.request.validatedBody.iva_porcentaje, 13);

  const partial = runValidation(validateSettings, { formato_impresion: 'A4' }, {}, 'PUT');
  assert.equal(partial.error, undefined);
  assert.deepEqual(partial.request.validatedBody, { formato_impresion: 'A4' });

  const invalidTheme = runValidation(validateSettings, { tema: 'azul' }, {}, 'PUT');
  assert.equal(invalidTheme.error.code, 'VALIDATION_ERROR');

  const invalidCurrency = runValidation(validateSettings, { moneda: 'JPY' }, {}, 'PUT');
  assert.equal(invalidCurrency.error.code, 'VALIDATION_ERROR');

  const invalidTax = runValidation(validateSettings, { iva_porcentaje: 45 }, {}, 'PUT');
  assert.equal(invalidTax.error.code, 'VALIDATION_ERROR');

  const blankName = runValidation(validateSettings, { nombre_comercial: '   ' }, {}, 'PUT');
  assert.equal(blankName.error.code, 'VALIDATION_ERROR');

  const emptyBody = runValidation(validateSettings, {}, {}, 'PUT');
  assert.equal(emptyBody.error.code, 'VALIDATION_ERROR');
});
