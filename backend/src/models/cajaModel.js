const { pool } = require('../config/db');

async function findAll({ branchId, userId } = {}) {
  const values = [];
  const conditions = [];

  if (branchId) {
    values.push(branchId);
    conditions.push(`ct.id_sucursal = $${values.length}`);
  }

  if (userId) {
    values.push(userId);
    conditions.push(`ct.id_usuario = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ct.id_caja, ct.fecha_apertura, ct.fecha_cierre, ct.monto_inicial,
            COALESCE(turn_sales.total_ventas, 0) AS ingresos_pos,
            COALESCE(turn_rental.total_alquiler, 0) AS ingresos_alquiler,
            CASE WHEN ct.estado = 'abierta'
              THEN ct.monto_inicial
                + COALESCE(turn_sales.total_ventas, 0)
                + COALESCE(turn_rental.total_alquiler, 0)
              ELSE ct.total_calculado
            END AS total_calculado,
            ct.monto_declarado, ct.estado, ct.id_usuario,
            u.nombre AS nombre_usuario, ct.id_sucursal
     FROM caja_turnos ct
     JOIN usuarios u ON u.id_usuario = ct.id_usuario
     LEFT JOIN LATERAL (
       SELECT SUM(v.total_productos) AS total_ventas
       FROM ventas v
       WHERE v.id_sucursal = ct.id_sucursal
         AND v.id_usuario = ct.id_usuario
         AND v.fecha_venta >= ct.fecha_apertura
         AND v.fecha_venta <= COALESCE(ct.fecha_cierre, NOW())
     ) turn_sales ON TRUE
     LEFT JOIN LATERAL (
       SELECT SUM(sm.total_tiempo) AS total_alquiler
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       WHERE m.id_sucursal = ct.id_sucursal
         AND sm.id_usuario = ct.id_usuario
         AND sm.estado = 'finalizada'
         AND sm.hora_fin >= ct.fecha_apertura
         AND sm.hora_fin <= COALESCE(ct.fecha_cierre, NOW())
     ) turn_rental ON TRUE
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY ct.fecha_apertura DESC
     LIMIT 20`,
    values
  );
  return rows;
}

async function open({ id_sucursal, id_usuario, monto_inicial }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await client.query(
      `SELECT 1 FROM usuarios
       WHERE id_usuario = $1 AND id_sucursal = $2 AND activo = TRUE
       FOR UPDATE`,
      [id_usuario, id_sucursal]
    );
    if (!user.rowCount) {
      const error = new Error('El usuario no está activo o no pertenece a la sucursal indicada.');
      error.status = 400;
      error.code = 'INVALID_BRANCH_OPERATOR';
      throw error;
    }

    const existingOpenShift = await client.query(
      `SELECT 1 FROM caja_turnos
       WHERE id_usuario = $1 AND estado = 'abierta'
       LIMIT 1`,
      [id_usuario]
    );
    if (existingOpenShift.rowCount) {
      const error = new Error('Ya existe un turno abierto para este usuario.');
      error.status = 409;
      error.code = 'SHIFT_ALREADY_OPEN';
      throw error;
    }

    const { rows } = await client.query(
      `INSERT INTO caja_turnos (monto_inicial, id_usuario, id_sucursal, estado)
       VALUES ($1, $2, $3, 'abierta')
       RETURNING id_caja, fecha_apertura, fecha_cierre, monto_inicial,
                 total_calculado, monto_declarado, estado, id_usuario, id_sucursal`,
      [monto_inicial, id_usuario, id_sucursal]
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

async function close(id, { monto_declarado }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shift = await client.query(
      `SELECT id_caja, id_sucursal, id_usuario, fecha_apertura, monto_inicial, estado
       FROM caja_turnos
       WHERE id_caja = $1 AND estado = 'abierta'
       FOR UPDATE`,
      [id]
    );

    if (!shift.rowCount) {
      const error = new Error('No se encontró un turno abierto con ese identificador.');
      error.status = 404;
      error.code = 'SHIFT_NOT_FOUND';
      throw error;
    }

    const current = shift.rows[0];
    const total = await client.query(
      `SELECT current_shift.monto_inicial
                + COALESCE((
                    SELECT SUM(v.total_productos)
                    FROM ventas v
                    WHERE v.id_sucursal = current_shift.id_sucursal
                      AND v.id_usuario = current_shift.id_usuario
                      AND v.fecha_venta >= current_shift.fecha_apertura
                      AND v.fecha_venta <= NOW()
                  ), 0)
                + COALESCE((
                    SELECT SUM(sm.total_tiempo)
                    FROM sesiones_mesa sm
                    JOIN mesas m ON m.id_mesa = sm.id_mesa
                    WHERE m.id_sucursal = current_shift.id_sucursal
                      AND sm.id_usuario = current_shift.id_usuario
                      AND sm.estado = 'finalizada'
                      AND sm.hora_fin >= current_shift.fecha_apertura
                      AND sm.hora_fin <= NOW()
                  ), 0) AS total_calculado
       FROM caja_turnos current_shift
       WHERE current_shift.id_caja = $1`,
      [id]
    );

    const { rows } = await client.query(
      `UPDATE caja_turnos
       SET fecha_cierre = NOW(),
           monto_declarado = $2,
           total_calculado = $3,
           estado = 'cerrada'
       WHERE id_caja = $1
       RETURNING id_caja, fecha_apertura, fecha_cierre, monto_inicial,
                 total_calculado, monto_declarado, estado, id_usuario, id_sucursal`,
      [id, monto_declarado, Number(total.rows[0].total_calculado || 0)]
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

module.exports = { findAll, open, close };
