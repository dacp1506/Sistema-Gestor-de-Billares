const { pool } = require('../config/db');

const periods = {
  diario: {
    start: "date_trunc('day', NOW())",
    group: "date_trunc('hour', event_date)",
    label: 'hour',
  },
  semanal: {
    start: "date_trunc('day', NOW()) - INTERVAL '6 days'",
    group: "date_trunc('day', event_date)",
    label: 'day',
  },
  mensual: {
    start: "date_trunc('month', NOW())",
    group: "date_trunc('day', event_date)",
    label: 'day',
  },
  anual: {
    start: "date_trunc('year', NOW())",
    group: "date_trunc('month', event_date)",
    label: 'month',
  },
};

async function getSummary({ branchId, period }) {
  const selected = periods[period];
  if (!selected) throw new Error('Unsupported report period.');
  const values = [];
  const branchPredicate = branchId ? `AND branch_id = $${values.push(branchId)}` : '';
  const revenue = await pool.query(
    `WITH events AS (
       SELECT fecha_venta AS event_date, id_sucursal AS branch_id,
              total_productos AS amount, tipo_venta AS kind
       FROM ventas
       WHERE fecha_venta >= ${selected.start}
       UNION ALL
       SELECT hora_fin AS event_date, m.id_sucursal AS branch_id,
              sm.total_tiempo AS amount, 'sesion' AS kind
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       WHERE sm.estado = 'finalizada' AND hora_fin >= ${selected.start}
     )
     SELECT
       COUNT(*) FILTER (WHERE kind IN ('directa', 'mesa'))::INTEGER AS ventas,
       COUNT(*) FILTER (WHERE kind = 'sesion')::INTEGER AS sesiones_finalizadas,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'directa'), 0)::NUMERIC(12,2) AS ventas_directas,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'mesa'), 0)::NUMERIC(12,2) AS consumos_mesa,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'sesion'), 0)::NUMERIC(12,2) AS alquiler_mesas,
       COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS ingresos_totales
     FROM events WHERE event_date < NOW() ${branchPredicate}`,
    values,
  );
  const salesSeries = await pool.query(
    `WITH events AS (
       SELECT fecha_venta AS event_date, id_sucursal AS branch_id,
              total_productos AS amount, tipo_venta AS kind
       FROM ventas WHERE fecha_venta >= ${selected.start}
       UNION ALL
       SELECT hora_fin, m.id_sucursal, sm.total_tiempo, 'sesion'
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       WHERE sm.estado = 'finalizada' AND hora_fin >= ${selected.start}
     )
     SELECT ${selected.group} AS periodo,
            COALESCE(SUM(amount) FILTER (WHERE kind = 'sesion'), 0)::NUMERIC(12,2) AS alquiler_mesas,
            COALESCE(SUM(amount) FILTER (WHERE kind <> 'sesion'), 0)::NUMERIC(12,2) AS ventas_productos,
            COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total
     FROM events WHERE event_date < NOW() ${branchPredicate}
     GROUP BY periodo ORDER BY periodo`,
    values,
  );
  const branchValues = [];
  const byBranchPredicate = branchId ? `AND events.branch_id = $${branchValues.push(branchId)}` : '';
  const byBranch = await pool.query(
    `WITH events AS (
       SELECT fecha_venta AS event_date, id_sucursal AS branch_id, total_productos AS amount,
              tipo_venta AS kind
       FROM ventas
       WHERE fecha_venta >= ${selected.start}
       UNION ALL
       SELECT sm.hora_fin, m.id_sucursal, sm.total_tiempo, 'sesion'
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       WHERE sm.estado = 'finalizada' AND sm.hora_fin >= ${selected.start}
     )
     SELECT s.id_sucursal, s.nombre,
            COALESCE(SUM(events.amount) FILTER (WHERE events.kind = 'sesion'), 0)::NUMERIC(12,2) AS alquiler_mesas,
            COALESCE(SUM(events.amount) FILTER (WHERE events.kind <> 'sesion'), 0)::NUMERIC(12,2) AS ventas_productos,
            COALESCE(SUM(events.amount), 0)::NUMERIC(12,2) AS total
     FROM sucursales s
     JOIN events ON events.branch_id = s.id_sucursal
     WHERE events.branch_id IS NOT NULL AND events.event_date < NOW()
       ${byBranchPredicate}
     GROUP BY s.id_sucursal, s.nombre ORDER BY total DESC, s.nombre`,
    branchValues,
  );
  return {
    period,
    summary: revenue.rows[0],
    series: salesSeries.rows.map((row) => ({ ...row, etiqueta: new Date(row.periodo).toLocaleString('es-BO', { [selected.label]: selected.label === 'hour' ? '2-digit' : 'short', ...(selected.label === 'hour' ? {} : { day: '2-digit' }) }) })),
    branches: byBranch.rows,
  };
}

module.exports = { getSummary };
