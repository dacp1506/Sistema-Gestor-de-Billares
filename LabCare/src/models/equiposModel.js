const { pool } = require('../config/db');

async function listAvailable() {
  const result = await pool.query(
    `SELECT id, codigo, nombre, ubicacion, estado
     FROM equipos
     WHERE estado = 'OPERATIVO'
     ORDER BY codigo`
  );
  return result.rows;
}

async function findAvailableById(id) {
  const result = await pool.query(
    `SELECT id, codigo, nombre, ubicacion, estado
     FROM equipos
     WHERE id = $1 AND estado = 'OPERATIVO'`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listAvailable, findAvailableById };

