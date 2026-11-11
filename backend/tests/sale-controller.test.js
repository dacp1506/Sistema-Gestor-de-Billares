const test = require('node:test');
const assert = require('node:assert/strict');

const modelPath = require.resolve('../src/models/ventaModel');
const createdSales = [];
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    async create(input) {
      createdSales.push(input);
      return { id_venta: 1, ...input };
    },
  },
};

const controller = require('../src/controllers/finanzasController');

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

test('admin general can register a sale for an operator of the selected branch', async () => {
  createdSales.length = 0;
  const response = createResponse();
  await controller.create(
    {
      validatedBody: {
        id_sucursal: 3,
        id_usuario: 12,
        tipo_venta: 'directa',
        id_sesion: null,
        items: [{ id_producto: 5, cantidad: 2 }],
      },
      user: { sub: '1', rol: 'admin_general' },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdSales[0].id_usuario, 12);
  assert.equal(createdSales[0].id_sucursal, 3);
});

test('branch users always register the sale with their own identity', async () => {
  createdSales.length = 0;
  const response = createResponse();
  await controller.create(
    {
      validatedBody: {
        id_sucursal: 3,
        id_usuario: 99,
        tipo_venta: 'directa',
        id_sesion: null,
        items: [{ id_producto: 5, cantidad: 1 }],
      },
      user: { sub: '4', rol: 'cajero', id_sucursal: 3 },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdSales[0].id_usuario, 4);
  assert.equal(createdSales[0].id_sucursal, 3);
});
