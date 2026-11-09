const { pool } = require('../config/db');

async function findAll({ branchId, date, tableId } = {}) {
  const values = [];
  const conditions = [];

  if (branchId) {
    values.push(branchId);
    conditions.push(`m.id_sucursal = $${values.length}`);
  }
  if (date) {
    values.push(date);
    conditions.push(`r.fecha_reserva = $${values.length}`);
  }
  if (tableId) {
    values.push(tableId);
    conditions.push(`r.id_mesa = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT r.id_reserva, r.nombre_cliente, r.telefono_cliente, r.fecha_reserva,
            r.hora_inicio, r.duracion_minutos, r.estado, r.id_mesa,
            m.numero_mesa, m.tipo_mesa, m.id_sucursal, s.nombre AS nombre_sucursal
     FROM reservas r
     JOIN mesas m ON m.id_mesa = r.id_mesa
     JOIN sucursales s ON s.id_sucursal = m.id_sucursal
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY r.fecha_reserva, r.hora_inicio, r.id_reserva`,
    values
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.id_reserva, r.nombre_cliente, r.telefono_cliente, r.fecha_reserva,
            r.hora_inicio, r.duracion_minutos, r.estado, r.id_mesa,
            m.numero_mesa, m.tipo_mesa, m.id_sucursal, s.nombre AS nombre_sucursal
     FROM reservas r
     JOIN mesas m ON m.id_mesa = r.id_mesa
     JOIN sucursales s ON s.id_sucursal = m.id_sucursal
     WHERE r.id_reserva = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio, duracion_minutos, id_mesa, estado = 'pendiente' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mesa = await client.query(
      `SELECT id_mesa, id_sucursal FROM mesas
       WHERE id_mesa = $1 AND activa = TRUE
       FOR UPDATE`,
      [id_mesa]
    );
    if (!mesa.rowCount) {
      const error = new Error('La mesa indicada no existe o está inactiva.');
      error.status = 404;
      error.code = 'TABLE_NOT_FOUND';
      throw error;
    }

    const overlap = await client.query(
      `SELECT 1
       FROM reservas
       WHERE id_mesa = $1
         AND fecha_reserva = $2
         AND estado IN ('pendiente', 'confirmada')
         AND (hora_inicio, (hora_inicio + (duracion_minutos || ' minutes')::interval))
             OVERLAPS ($3::time, ($3::time + ($4 || ' minutes')::interval))
       LIMIT 1`,
      [id_mesa, fecha_reserva, hora_inicio, duracion_minutos]
    );
    if (overlap.rowCount) {
      const error = new Error('Ya existe una reserva activa que se solapa con este horario.');
      error.status = 409;
      error.code = 'RESERVATION_CONFLICT';
      throw error;
    }

    const { rows } = await client.query(
      `INSERT INTO reservas (nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio, duracion_minutos, estado, id_mesa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_reserva, nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio,
                 duracion_minutos, estado, id_mesa`,
      [nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio, duracion_minutos, estado, id_mesa]
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

async function updateStatus(id, { estado }) {
  const { rows } = await pool.query(
    `UPDATE reservas
     SET estado = $2
     WHERE id_reserva = $1
     RETURNING id_reserva, nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio,
               duracion_minutos, estado, id_mesa`,
    [id, estado]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, updateStatus };
