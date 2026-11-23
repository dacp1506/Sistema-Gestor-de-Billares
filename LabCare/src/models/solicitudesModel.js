const { pool } = require('../config/db');

async function list({ q = '', prioridad = '', estado = '' }) {
  const conditions = ['s.activo = TRUE'];
  const values = [];
  let position = 1;

  if (q.trim()) {
    values.push(`%${q.trim()}%`);
    conditions.push(`(s.codigo_solicitud ILIKE $${position} OR s.solicitante ILIKE $${position} OR e.nombre ILIKE $${position})`);
    position += 1;
  }
  if (prioridad) {
    values.push(prioridad);
    conditions.push(`s.prioridad = $${position}`);
    position += 1;
  }
  if (estado) {
    values.push(estado);
    conditions.push(`s.estado = $${position}`);
  }

  const result = await pool.query(
    `SELECT s.id, s.codigo_solicitud, s.solicitante, s.descripcion,
            s.prioridad, s.estado, s.fecha_registro, s.fecha_actualizacion, s.activo,
            e.id AS equipo_id, e.codigo AS equipo_codigo, e.nombre AS equipo,
            e.ubicacion AS equipo_ubicacion
     FROM solicitudes s
     JOIN equipos e ON e.id = s.equipo_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.fecha_registro DESC, s.id DESC`,
    values
  );
  return result.rows;
}

async function findActiveById(id) {
  const result = await pool.query(
    `SELECT s.id, s.codigo_solicitud, s.solicitante, s.descripcion,
            s.prioridad, s.estado, s.fecha_registro, s.fecha_actualizacion, s.activo,
            e.id AS equipo_id, e.codigo AS equipo_codigo, e.nombre AS equipo,
            e.ubicacion AS equipo_ubicacion
     FROM solicitudes s
     JOIN equipos e ON e.id = s.equipo_id
     WHERE s.id = $1 AND s.activo = TRUE`,
    [id]
  );
  return result.rows[0] || null;
}

async function generateCode(client, date = new Date()) {
  const dateText = date.toISOString().slice(0, 10).replaceAll('-', '');
  const prefix = `SOL-${dateText}-`;
  const result = await client.query(
    `SELECT codigo_solicitud FROM solicitudes
     WHERE codigo_solicitud LIKE $1
     ORDER BY codigo_solicitud DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (result.rows[0]) {
    const suffix = Number(result.rows[0].codigo_solicitud.slice(prefix.length));
    if (Number.isInteger(suffix)) next = suffix + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function create(values) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const codigo_solicitud = await generateCode(client);
    const result = await client.query(
      `INSERT INTO solicitudes
       (codigo_solicitud, equipo_id, solicitante, descripcion, prioridad, estado)
       VALUES ($1, $2, $3, $4, $5, 'PENDIENTE')
       RETURNING *`,
      [codigo_solicitud, values.equipo_id, values.solicitante, values.descripcion, values.prioridad]
    );
    await client.query('COMMIT');
    return findActiveById(result.rows[0].id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, values) {
  const result = await pool.query(
    `UPDATE solicitudes
     SET equipo_id = $2, solicitante = $3, descripcion = $4, prioridad = $5,
         fecha_actualizacion = NOW()
     WHERE id = $1 AND activo = TRUE
     RETURNING id`,
    [id, values.equipo_id, values.solicitante, values.descripcion, values.prioridad]
  );
  return result.rows[0] || null;
}

async function findSystemFieldsById(id) {
  const result = await pool.query(
    `SELECT id, estado, activo FROM solicitudes WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function changeState(id, estado) {
  const result = await pool.query(
    `UPDATE solicitudes
     SET estado = $2, fecha_actualizacion = NOW()
     WHERE id = $1 AND activo = TRUE
     RETURNING id, estado`,
    [id, estado]
  );
  return result.rows[0] || null;
}

async function logicalDelete(id) {
  const result = await pool.query(
    `UPDATE solicitudes
     SET activo = FALSE, fecha_actualizacion = NOW()
     WHERE id = $1 AND activo = TRUE
     RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  list, findActiveById, create, update, findSystemFieldsById,
  changeState, logicalDelete
};

