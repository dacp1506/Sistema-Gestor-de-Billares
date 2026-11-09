const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/middlewares/error-handler');

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
    }
  };
}

test('database DNS errors return a sanitized service-unavailable response', () => {
  const response = createResponse();
  const previousError = console.error;
  console.error = () => {};
  try {
    errorHandler(
      Object.assign(new Error('private database host failed'), {
        code: 'ENOTFOUND',
        hostname: 'private-database-host'
      }),
      {},
      response,
      () => assert.fail('No debe delegar errores de conexión conocidos')
    );
  } finally {
    console.error = previousError;
  }

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE');
  assert.equal(response.body.error.message.includes('private-database-host'), false);
});

test('database certificate errors return a sanitized TLS configuration response', () => {
  const response = createResponse();
  const previousError = console.error;
  console.error = () => {};
  try {
    errorHandler(
      Object.assign(new Error('private certificate detail'), {
        code: 'SELF_SIGNED_CERT_IN_CHAIN'
      }),
      {},
      response,
      () => assert.fail('No debe delegar errores de certificado conocidos')
    );
  } finally {
    console.error = previousError;
  }

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'DATABASE_TLS_INVALID');
  assert.equal(response.body.error.message.includes('private certificate detail'), false);
});

test('missing database errors return a sanitized connection configuration response', () => {
  const response = createResponse();
  errorHandler(
    Object.assign(new Error('private database name'), { code: '3D000' }),
    {},
    response,
    () => assert.fail('No debe delegar errores conocidos de PostgreSQL')
  );

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'DATABASE_NOT_FOUND');
  assert.equal(response.body.error.message.includes('private database name'), false);
});
