const { pool } = require('../config/db');

async function findAll({ includeInactive = false } = {}) {
  const query = `
    SELECT id_sucursal, nombre, direccion, telefono, estado, creado_en
    FROM sucursales
    ${includeInactive ? '' : 'WHERE estado = TRUE'}
    ORDER BY nombre, id_sucursal
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id_sucursal, nombre, direccion, telefono, estado, creado_en
     FROM sucursales WHERE id_sucursal = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ nombre, direccion, telefono, estado }) {
  const { rows } = await pool.query(
    `INSERT INTO sucursales (nombre, direccion, telefono, estado)
     VALUES ($1, $2, $3, COALESCE($4, TRUE))
     RETURNING id_sucursal, nombre, direccion, telefono, estado, creado_en`,
    [nombre, direccion, telefono, estado ?? null]
  );
  return rows[0];
}

async function update(id, { nombre, direccion, telefono, estado }) {
  const { rows } = await pool.query(
    `UPDATE sucursales
     SET nombre = $2, direccion = $3, telefono = $4,
         estado = COALESCE($5, estado), actualizado_en = NOW()
     WHERE id_sucursal = $1 AND estado = TRUE
     RETURNING id_sucursal, nombre, direccion, telefono, estado, creado_en`,
    [id, nombre, direccion, telefono, estado ?? null]
  );
  return rows[0] || null;
}

async function deactivate(id) {
  const { rows } = await pool.query(
    `UPDATE sucursales SET estado = FALSE, actualizado_en = NOW()
     WHERE id_sucursal = $1 AND estado = TRUE
     RETURNING id_sucursal, nombre, direccion, telefono, estado, creado_en`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, deactivate };
