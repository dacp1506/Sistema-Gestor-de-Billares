const test = require('node:test');
const assert = require('node:assert/strict');

const modelPath = require.resolve('../src/models/cajaModel');
const openedShifts = [];
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    async open(input) {
      openedShifts.push(input);
      return { id_caja: 1, ...input };
    },
  },
};

const controller = require('../src/controllers/cajaController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('admin general can open a cash shift for an operator of the selected branch', async () => {
  openedShifts.length = 0;
  const response = createResponse();
  await controller.open(
    {
      validatedBody: { id_sucursal: 3, id_usuario: 12, monto_inicial: 200 },
      user: { sub: '1', rol: 'admin_general' },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.equal(openedShifts[0].id_usuario, 12);
  assert.equal(openedShifts[0].id_sucursal, 3);
  assert.equal(openedShifts[0].monto_inicial, 200);
});

test('branch users always open the shift with their own identity', async () => {
  openedShifts.length = 0;
  const response = createResponse();
  await controller.open(
    {
      validatedBody: { id_sucursal: 3, id_usuario: 99, monto_inicial: 150 },
      user: { sub: '4', rol: 'cajero', id_sucursal: 3 },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.equal(openedShifts[0].id_usuario, 4);
  assert.equal(openedShifts[0].id_sucursal, 3);
});
