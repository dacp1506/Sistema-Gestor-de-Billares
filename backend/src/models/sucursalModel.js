const { pool } = require('../config/db');

async function findAll({ includeInactive = false, branchId } = {}) {
  const values = [];
  const conditions = [];
  if (!includeInactive) conditions.push('s.estado = TRUE');
  if (branchId != null) {
    values.push(branchId);
    conditions.push(`s.id_sucursal = $${values.length}`);
  }

  const query = `
    SELECT s.id_sucursal, s.nombre, s.direccion, s.telefono, s.estado, s.creado_en,
           COALESCE(t.mesas_total, 0)::INTEGER AS mesas_total,
           COALESCE(t.mesas_ocupadas, 0)::INTEGER AS mesas_ocupadas,
           ROUND(COALESCE(v.ingresos_productos, 0) + COALESCE(r.ingresos_alquiler, 0), 2) AS ingresos_hoy
    FROM sucursales s
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER AS mesas_total,
             COUNT(*) FILTER (WHERE m.estado = 'ocupada')::INTEGER AS mesas_ocupadas
      FROM mesas m
      WHERE m.id_sucursal = s.id_sucursal AND m.activa = TRUE
    ) t ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(venta.total_productos), 0) AS ingresos_productos
      FROM ventas venta
      WHERE venta.id_sucursal = s.id_sucursal
        AND venta.fecha_venta >= date_trunc('day', NOW())
    ) v ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(sm.total_tiempo), 0) AS ingresos_alquiler
      FROM sesiones_mesa sm
      JOIN mesas mesa ON mesa.id_mesa = sm.id_mesa
      WHERE mesa.id_sucursal = s.id_sucursal
        AND sm.estado = 'finalizada'
        AND sm.hora_fin >= date_trunc('day', NOW())
    ) r ON TRUE
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY s.nombre, s.id_sucursal
  `;
  const { rows } = await pool.query(query, values);
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
