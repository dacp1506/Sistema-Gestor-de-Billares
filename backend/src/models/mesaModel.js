const { pool } = require('../config/db');

async function findByBranch(branchId) {
  const { rows } = await pool.query(
    `SELECT id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, id_sucursal, creado_en
     FROM mesas
     WHERE id_sucursal = $1 AND activa = TRUE
     ORDER BY numero_mesa, id_mesa`,
    [branchId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, id_sucursal, creado_en
     FROM mesas WHERE id_mesa = $1 AND activa = TRUE`,
    [id]
  );
  return rows[0] || null;
}

async function create({ numero_mesa, tipo_mesa, tarifa_minuto, id_sucursal, estado }) {
  const { rows } = await pool.query(
    `INSERT INTO mesas (numero_mesa, tipo_mesa, tarifa_minuto, id_sucursal, estado)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'libre'))
     RETURNING id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, id_sucursal, creado_en`,
    [numero_mesa, tipo_mesa, tarifa_minuto, id_sucursal, estado || null]
  );
  return rows[0];
}

async function update(id, { numero_mesa, tipo_mesa, tarifa_minuto, estado }) {
  const { rows } = await pool.query(
    `UPDATE mesas
     SET numero_mesa = $2, tipo_mesa = $3, tarifa_minuto = $4,
         estado = COALESCE($5, estado), actualizado_en = NOW()
     WHERE id_mesa = $1 AND activa = TRUE AND estado <> 'ocupada'
     RETURNING id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, id_sucursal, creado_en`,
    [id, numero_mesa, tipo_mesa, tarifa_minuto, estado || null]
  );
  return rows[0] || null;
}

async function deactivate(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const table = await client.query(
      `SELECT id_mesa FROM mesas
       WHERE id_mesa = $1 AND activa = TRUE
       FOR UPDATE`,
      [id]
    );
    if (!table.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    const activeSession = await client.query(
      `SELECT 1 FROM sesiones_mesa
       WHERE id_mesa = $1 AND estado IN ('activa', 'pausada')
       LIMIT 1`,
      [id]
    );
    if (activeSession.rowCount) {
      await client.query('ROLLBACK');
      return 'active_session';
    }

    const { rows } = await client.query(
      `UPDATE mesas SET activa = FALSE, actualizado_en = NOW()
       WHERE id_mesa = $1
       RETURNING id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, id_sucursal, creado_en`,
      [id]
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { findByBranch, findById, create, update, deactivate };
