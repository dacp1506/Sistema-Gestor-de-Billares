const { pool } = require('../config/db');
const { ESTADO_INICIAL } = require('../domain/solicitud');

const SELECT_FIELDS = `
  s.id_solicitud, s.codigo_solicitud, s.id_equipo, s.id_sucursal,
  s.solicitante, s.descripcion, s.prioridad, s.estado,
  s.fecha_registro, s.fecha_actualizacion, s.activo,
  e.codigo AS equipo_codigo, e.nombre AS equipo, e.ubicacion AS equipo_ubicacion,
  e.estado AS equipo_estado`;

async function list({ branchId, q = '', prioridad = '', estado = '' }) {
  const conditions = ['s.id_sucursal = $1', 's.activo = TRUE'];
  const values = [branchId];

  if (q.trim()) {
    values.push(`%${q.trim()}%`);
    const position = values.length;
    conditions.push(`(
      s.codigo_solicitud ILIKE $${position}
      OR s.solicitante ILIKE $${position}
      OR e.nombre ILIKE $${position}
      OR e.codigo ILIKE $${position}
    )`);
  }
  if (prioridad) {
    values.push(prioridad);
    conditions.push(`s.prioridad = $${values.length}`);
  }
  if (estado) {
    values.push(estado);
    conditions.push(`s.estado = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM solicitudes_mantenimiento s
     JOIN equipos e ON e.id_equipo = s.id_equipo
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.fecha_registro DESC, s.id_solicitud DESC`,
    values
  );
  return rows;
}

async function findActiveById(id, runner = pool) {
  const { rows } = await runner.query(
    `SELECT ${SELECT_FIELDS}
     FROM solicitudes_mantenimiento s
     JOIN equipos e ON e.id_equipo = s.id_equipo
     WHERE s.id_solicitud = $1 AND s.activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

async function findSystemFieldsById(id) {
  const { rows } = await pool.query(
    `SELECT id_solicitud, id_equipo, id_sucursal, estado, activo
     FROM solicitudes_mantenimiento
     WHERE id_solicitud = $1`,
    [id]
  );
  return rows[0] || null;
}

async function generateCode(client) {
  // Serializa la generación del correlativo diario para evitar códigos duplicados
  // cuando dos usuarios registran solicitudes al mismo tiempo.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('solicitudes_mantenimiento_codigo'))`);
  const { rows: dateRows } = await client.query(
    `SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') AS fecha`
  );
  const prefix = `SOL-${dateRows[0].fecha}-`;
  const { rows } = await client.query(
    `SELECT codigo_solicitud
     FROM solicitudes_mantenimiento
     WHERE codigo_solicitud LIKE $1
     ORDER BY codigo_solicitud DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  const lastSuffix = rows[0]?.codigo_solicitud?.slice(prefix.length) || '';
  const next = /^\d+$/.test(lastSuffix) ? Number(lastSuffix) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function create({ id_equipo, id_sucursal, solicitante, descripcion, prioridad }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const codigo_solicitud = await generateCode(client);
    const { rows } = await client.query(
      `INSERT INTO solicitudes_mantenimiento
        (codigo_solicitud, id_equipo, id_sucursal, solicitante, descripcion, prioridad, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_solicitud`,
      [codigo_solicitud, id_equipo, id_sucursal, solicitante, descripcion, prioridad, ESTADO_INICIAL]
    );
    const solicitud = await findActiveById(rows[0].id_solicitud, client);
    await client.query('COMMIT');
    return solicitud;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, { id_equipo, solicitante, descripcion, prioridad }) {
  const { rows } = await pool.query(
    `UPDATE solicitudes_mantenimiento
     SET id_equipo = $2, solicitante = $3, descripcion = $4, prioridad = $5,
         fecha_actualizacion = NOW()
     WHERE id_solicitud = $1 AND activo = TRUE
     RETURNING id_solicitud`,
    [id, id_equipo, solicitante, descripcion, prioridad]
  );
  if (!rows[0]) return null;
  return findActiveById(rows[0].id_solicitud);
}

async function changeState(id, estado) {
  const { rows } = await pool.query(
    `UPDATE solicitudes_mantenimiento
     SET estado = $2, fecha_actualizacion = NOW()
     WHERE id_solicitud = $1 AND activo = TRUE
     RETURNING id_solicitud`,
    [id, estado]
  );
  if (!rows[0]) return null;
  return findActiveById(rows[0].id_solicitud);
}

async function logicalDelete(id) {
  const { rows } = await pool.query(
    `UPDATE solicitudes_mantenimiento
     SET activo = FALSE, fecha_actualizacion = NOW()
     WHERE id_solicitud = $1 AND activo = TRUE
     RETURNING id_solicitud`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  list,
  findActiveById,
  findSystemFieldsById,
  generateCode,
  create,
  update,
  changeState,
  logicalDelete
};
