const test = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
let adminExists = false;
const client = {
  async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes("WHERE rol = 'admin_general'")) {
      return { rowCount: adminExists ? 1 : 0, rows: adminExists ? [{}] : [] };
    }
    if (sql.includes('INSERT INTO usuarios')) {
      return {
        rowCount: 1,
        rows: [{
          id_usuario: 1,
          nombre: values[0],
          username: null,
          email: values[1],
          rol: 'admin_general',
          id_sucursal: null,
          activo: true,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  },
  release() {},
};

const databasePath = require.resolve('../src/config/db');
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { pool: { connect: async () => client } },
};

const Usuario = require('../src/models/usuarioModel');

test('public registration creates only the first general administrator under a transaction lock', async () => {
  calls.length = 0;
  adminExists = false;

  const user = await Usuario.createFirstAdminGeneral({
    nombre: 'Admin',
    email: 'admin@example.com',
    password: 'a secure password',
  });

  assert.equal(user.rol, 'admin_general');
  assert.equal(user.email, 'admin@example.com');
  assert.equal(calls[0].sql, 'BEGIN');
  assert.match(calls[1].sql, /pg_advisory_xact_lock/);
  assert.ok(calls.some(({ sql }) => sql.includes('INSERT INTO usuarios')));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('public registration refuses when a general administrator already exists', async () => {
  calls.length = 0;
  adminExists = true;

  await assert.rejects(
    Usuario.createFirstAdminGeneral({
      nombre: 'Another admin',
      email: 'other@example.com',
      password: 'a secure password',
    }),
    (error) => error.code === 'PUBLIC_REGISTRATION_CLOSED',
  );

  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.ok(!calls.some(({ sql }) => sql.includes('INSERT INTO usuarios')));
});
