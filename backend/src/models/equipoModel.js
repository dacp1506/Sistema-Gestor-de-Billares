const { pool } = require('../config/db');

const EQUIPMENT_FIELDS = `id_equipo, codigo, nombre, ubicacion, estado, id_sucursal, creado_en`;

async function findAvailableByBranch(branchId) {
  const { rows } = await pool.query(
    `SELECT ${EQUIPMENT_FIELDS}
     FROM equipos
     WHERE id_sucursal = $1 AND estado = 'OPERATIVO'
     ORDER BY codigo, id_equipo`,
    [branchId]
  );
  return rows;
}

async function findAvailableById(id, branchId) {
  const { rows } = await pool.query(
    `SELECT ${EQUIPMENT_FIELDS}
     FROM equipos
     WHERE id_equipo = $1 AND id_sucursal = $2 AND estado = 'OPERATIVO'`,
    [id, branchId]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${EQUIPMENT_FIELDS} FROM equipos WHERE id_equipo = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAvailableByBranch, findAvailableById, findById };
