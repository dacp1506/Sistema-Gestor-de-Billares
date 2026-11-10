const test = require('node:test');
const assert = require('node:assert/strict');

const modelPath = require.resolve('../src/models/sesionModel');
const startedSessions = [];
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: {
    async start(input) {
      startedSessions.push(input);
      return input;
    },
  },
};

const controller = require('../src/controllers/sesionController');

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

test('admin general can start a session assigned to an operator in the selected branch', async () => {
  startedSessions.length = 0;
  const response = createResponse();
  await controller.start(
    {
      body: { id_mesa: 8, id_usuario: 12 },
      user: { sub: '1', rol: 'admin_general' },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(startedSessions[0], { id_mesa: 8, id_usuario: 12 });
});

test('branch users cannot choose another operator when starting a session', async () => {
  startedSessions.length = 0;
  const response = createResponse();
  await controller.start(
    {
      body: { id_mesa: 8, id_usuario: 99 },
      user: { sub: '4', rol: 'cajero' },
    },
    response,
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(startedSessions[0], { id_mesa: 8, id_usuario: 4 });
});
