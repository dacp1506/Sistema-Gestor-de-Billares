const { pool } = require('../config/db');

async function findAll({ branchId, activeOnly = false } = {}) {
  const values = [];
  const conditions = [];
  if (branchId) {
    values.push(branchId);
    conditions.push(`m.id_sucursal = $${values.length}`);
  }
  if (activeOnly) conditions.push("sm.estado IN ('activa', 'pausada')");
  const { rows } = await pool.query(
    `SELECT sm.id_sesion, sm.id_mesa, m.numero_mesa, m.id_sucursal,
            sm.id_usuario, sm.tarifa_minuto, sm.hora_inicio, sm.hora_fin,
            sm.pausada_en, sm.segundos_pausa, sm.minutos_totales,
            sm.total_tiempo, sm.estado
     FROM sesiones_mesa sm
     JOIN mesas m ON m.id_mesa = sm.id_mesa
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY sm.hora_inicio DESC`,
    values
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT sm.id_sesion, sm.id_mesa, m.numero_mesa, m.id_sucursal,
            sm.id_usuario, sm.tarifa_minuto, sm.hora_inicio, sm.hora_fin,
            sm.pausada_en, sm.segundos_pausa, sm.minutos_totales,
            sm.total_tiempo, sm.estado
     FROM sesiones_mesa sm
     JOIN mesas m ON m.id_mesa = sm.id_mesa
     WHERE sm.id_sesion = $1`,
    [id]
  );
  return rows[0] || null;
}

async function start({ id_mesa, id_usuario }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tableResult = await client.query(
      `SELECT id_mesa, id_sucursal, tarifa_minuto, estado
       FROM mesas WHERE id_mesa = $1 AND activa = TRUE FOR UPDATE`,
      [id_mesa]
    );
    const table = tableResult.rows[0];
    if (!table || table.estado !== 'libre') {
      throw httpError(409, 'TABLE_NOT_AVAILABLE', 'La mesa no existe, está inactiva o no está libre.');
    }

    const operator = await client.query(
      `SELECT 1 FROM usuarios
       WHERE id_usuario = $1 AND id_sucursal = $2 AND activo = TRUE`,
      [id_usuario, table.id_sucursal]
    );
    if (!operator.rowCount) {
      throw httpError(400, 'INVALID_BRANCH_OPERATOR', 'El usuario no está activo o no pertenece a la sucursal de la mesa.');
    }

    const { rows } = await client.query(
      `INSERT INTO sesiones_mesa (id_mesa, id_usuario, tarifa_minuto)
       VALUES ($1, $2, $3)
       RETURNING id_sesion, id_mesa, id_usuario, tarifa_minuto, hora_inicio,
                 hora_fin, minutos_totales, total_tiempo, estado`,
      [id_mesa, id_usuario, table.tarifa_minuto]
    );
    await client.query(
      `UPDATE mesas SET estado = 'ocupada', actualizado_en = NOW()
       WHERE id_mesa = $1`,
      [id_mesa]
    );
    await client.query('COMMIT');
    return { ...rows[0], id_sucursal: table.id_sucursal };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function pause(id) {
  return updateActiveSession(id, async (client, session) => {
    if (session.estado !== 'activa') {
      throw httpError(409, 'SESSION_NOT_RUNNING', 'Solo se puede pausar una sesión activa.');
    }
    const { rows } = await client.query(
      `UPDATE sesiones_mesa SET estado = 'pausada', pausada_en = NOW()
       WHERE id_sesion = $1
       RETURNING id_sesion, id_mesa, id_usuario, tarifa_minuto, hora_inicio,
                 hora_fin, pausada_en, segundos_pausa, minutos_totales, total_tiempo, estado`,
      [id]
    );
    return rows[0];
  });
}

async function resume(id) {
  return updateActiveSession(id, async (client, session) => {
    if (session.estado !== 'pausada') {
      throw httpError(409, 'SESSION_NOT_PAUSED', 'Solo se puede reanudar una sesión pausada.');
    }
    const { rows } = await client.query(
      `UPDATE sesiones_mesa
       SET estado = 'activa',
           segundos_pausa = segundos_pausa + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - pausada_en)))::BIGINT),
           pausada_en = NULL
       WHERE id_sesion = $1
       RETURNING id_sesion, id_mesa, id_usuario, tarifa_minuto, hora_inicio,
                 hora_fin, pausada_en, segundos_pausa, minutos_totales, total_tiempo, estado`,
      [id]
    );
    return rows[0];
  });
}

async function finish(id) {
  return updateActiveSession(id, async (client, session) => {
    const { rows } = await client.query(
      `UPDATE sesiones_mesa
       SET estado = 'finalizada',
           hora_fin = NOW(),
           segundos_pausa = segundos_pausa +
             CASE WHEN estado = 'pausada'
               THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - pausada_en)))::BIGINT)
               ELSE 0
             END,
           minutos_totales = GREATEST(1, CEIL(GREATEST(0,
             EXTRACT(EPOCH FROM (NOW() - hora_inicio)) - segundos_pausa -
             CASE WHEN estado = 'pausada'
               THEN EXTRACT(EPOCH FROM (NOW() - pausada_en))
               ELSE 0
             END) / 60.0)::INTEGER),
           total_tiempo = ROUND(
             GREATEST(1, CEIL(GREATEST(0,
               EXTRACT(EPOCH FROM (NOW() - hora_inicio)) - segundos_pausa -
               CASE WHEN estado = 'pausada'
                 THEN EXTRACT(EPOCH FROM (NOW() - pausada_en))
                 ELSE 0
               END) / 60.0)) * tarifa_minuto, 2),
           pausada_en = NULL
       WHERE id_sesion = $1
       RETURNING id_sesion, id_mesa, id_usuario, tarifa_minuto, hora_inicio,
                 hora_fin, pausada_en, segundos_pausa, minutos_totales, total_tiempo, estado`,
      [id]
    );
    await client.query(
      `UPDATE mesas SET estado = 'libre', actualizado_en = NOW()
       WHERE id_mesa = $1`,
      [session.id_mesa]
    );
    return rows[0];
  });
}

async function updateActiveSession(id, update) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id_sesion, id_mesa, estado
       FROM sesiones_mesa
       WHERE id_sesion = $1 AND estado IN ('activa', 'pausada')
       FOR UPDATE`,
      [id]
    );
    const session = result.rows[0];
    if (!session) throw httpError(404, 'ACTIVE_SESSION_NOT_FOUND', 'No se encontró una sesión activa con ese identificador.');
    const updated = await update(client, session);
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

module.exports = { findAll, findById, start, pause, resume, finish };
