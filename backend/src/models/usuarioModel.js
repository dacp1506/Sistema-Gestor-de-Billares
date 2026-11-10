const { pool } = require('../config/db');
const { hashPassword } = require('../config/auth');

async function findAll({ branchId, includeInactive = false } = {}) {
  const values = [];
  const conditions = [];

  if (branchId) {
    values.push(branchId);
    conditions.push(`u.id_sucursal = $${values.length}`);
  }

  if (!includeInactive) {
    conditions.push('u.activo = TRUE');
  }

  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.username, u.email, u.rol, u.id_sucursal, u.activo, u.creado_en
     FROM usuarios u
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY u.nombre, u.id_usuario`,
    values
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.username, u.email, u.rol, u.id_sucursal, u.activo, u.creado_en
     FROM usuarios u
     WHERE u.id_usuario = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  return findByLoginIdentifier(email);
}

async function findByLoginIdentifier(identifier) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.username, u.email, u.password_hash, u.rol, u.id_sucursal, u.activo
     FROM usuarios u
     WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
     LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

async function create({ nombre, username, email, password, rol, id_sucursal, activo }) {
  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, username, email, password_hash, rol, id_sucursal, activo)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
     RETURNING id_usuario, nombre, username, email, rol, id_sucursal, activo, creado_en`,
    [nombre, username ?? null, email ?? null, passwordHash, rol, id_sucursal ?? null, activo ?? null]
  );
  return rows[0];
}

async function createFirstAdminGeneral({ nombre, email, password }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [804218614]);
    const existing = await client.query(
      `SELECT 1 FROM usuarios
       WHERE rol = 'admin_general'
       LIMIT 1`,
    );
    if (existing.rowCount) {
      const { httpError } = require('../middlewares/validate');
      throw httpError(409, 'PUBLIC_REGISTRATION_CLOSED', 'El registro público ya está cerrado. Solicita acceso al administrador general.');
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, id_sucursal, activo)
       VALUES ($1, $2, $3, 'admin_general', NULL, TRUE)
       RETURNING id_usuario, nombre, username, email, rol, id_sucursal, activo, creado_en`,
      [nombre, email.toLowerCase(), passwordHash],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, { nombre, username, email, password, rol, id_sucursal, activo }) {
  const fields = [];
  const values = [id];

  if (nombre !== undefined) {
    fields.push(`nombre = $${values.length + 1}`);
    values.push(nombre);
  }
  if (username !== undefined) {
    fields.push(`username = $${values.length + 1}`);
    values.push(username);
  }
  if (email !== undefined) {
    fields.push(`email = $${values.length + 1}`);
    values.push(email);
  }
  if (password !== undefined) {
    const passwordHash = await hashPassword(password);
    fields.push(`password_hash = $${values.length + 1}`);
    values.push(passwordHash);
  }
  if (rol !== undefined) {
    fields.push(`rol = $${values.length + 1}`);
    values.push(rol);
  }
  if (id_sucursal !== undefined) {
    fields.push(`id_sucursal = $${values.length + 1}`);
    values.push(id_sucursal ?? null);
  }
  if (activo !== undefined) {
    fields.push(`activo = $${values.length + 1}`);
    values.push(activo);
  }

  if (!fields.length) return await findById(id);

  fields.push('actualizado_en = NOW()');
  const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario = $1 RETURNING id_usuario, nombre, username, email, rol, id_sucursal, activo, creado_en`;
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function upgradePasswordHash(id, expectedHash, replacementHash) {
  const { rowCount } = await pool.query(
    `UPDATE usuarios SET password_hash = $3, actualizado_en = NOW()
     WHERE id_usuario = $1 AND password_hash = $2 AND activo = TRUE`,
    [id, expectedHash, replacementHash],
  );
  return rowCount === 1;
}

async function deactivate(id) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET activo = FALSE, actualizado_en = NOW()
     WHERE id_usuario = $1 AND activo = TRUE
     RETURNING id_usuario, nombre, username, email, rol, id_sucursal, activo, creado_en`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  findByLoginIdentifier,
  create,
  createFirstAdminGeneral,
  update,
  upgradePasswordHash,
  deactivate,
};
