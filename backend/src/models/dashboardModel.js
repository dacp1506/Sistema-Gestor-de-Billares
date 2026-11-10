const { pool } = require('../config/db');

async function findSummary({ branchId, userId }) {
  const values = [branchId];
  const userFilter = userId ? 'AND sm.id_usuario = $2' : '';
  const salesUserFilter = userId ? 'AND id_usuario = $2' : '';
  const salesValues = userId ? [branchId, userId] : [branchId];
  if (userId) values.push(userId);

  const rentalValues = userId ? [branchId, userId] : [branchId];

  const [tables, sessions, sales, cash, recentSales, rental] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE estado = 'libre')::INTEGER AS mesas_libres,
         COUNT(*) FILTER (WHERE estado = 'ocupada')::INTEGER AS mesas_ocupadas,
         COUNT(*) FILTER (WHERE estado = 'mantenimiento')::INTEGER AS mesas_mantenimiento,
         COUNT(*)::INTEGER AS mesas_total
       FROM mesas WHERE id_sucursal = $1 AND activa = TRUE`,
      [branchId],
    ),
    pool.query(
      `SELECT sm.id_sesion, sm.id_mesa, m.numero_mesa, m.tipo_mesa,
              sm.id_usuario, u.nombre AS nombre_usuario, sm.tarifa_minuto,
              sm.hora_inicio, sm.pausada_en, sm.segundos_pausa, sm.estado,
              GREATEST(0, FLOOR(
                EXTRACT(EPOCH FROM (COALESCE(sm.pausada_en, NOW()) - sm.hora_inicio)) - sm.segundos_pausa
              )::INTEGER) AS segundos_transcurridos,
              ROUND(GREATEST(1, CEIL(GREATEST(0,
                EXTRACT(EPOCH FROM (COALESCE(sm.pausada_en, NOW()) - sm.hora_inicio)) - sm.segundos_pausa
              ) / 60.0)) * sm.tarifa_minuto, 2) AS costo_estimado,
              COALESCE((
                SELECT SUM(v.total_productos)
                FROM ventas AS v
                WHERE v.id_sesion = sm.id_sesion
              ), 0)::NUMERIC(12,2) AS consumo_pos
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       JOIN usuarios u ON u.id_usuario = sm.id_usuario
       WHERE m.id_sucursal = $1 AND sm.estado IN ('activa', 'pausada') ${userFilter}
       ORDER BY sm.hora_inicio`,
      values,
    ),
    pool.query(
      `SELECT COUNT(*)::INTEGER AS cantidad,
              COALESCE(SUM(total_productos), 0)::NUMERIC(12,2) AS total,
              COALESCE(SUM(total_productos) FILTER (WHERE tipo_venta = 'directa'), 0)::NUMERIC(12,2) AS ventas_directas,
              COALESCE(SUM(total_productos) FILTER (WHERE tipo_venta = 'mesa'), 0)::NUMERIC(12,2) AS consumos_mesa
       FROM ventas
       WHERE id_sucursal = $1 AND fecha_venta >= date_trunc('day', NOW()) ${salesUserFilter}`,
      salesValues,
    ),
    pool.query(
      `SELECT COUNT(*)::INTEGER AS turnos_abiertos,
              COALESCE(SUM(monto_inicial), 0)::NUMERIC(12,2) AS base_abierta
       FROM caja_turnos
       WHERE id_sucursal = $1 AND estado = 'abierta' ${userId ? 'AND id_usuario = $2' : ''}`,
      values,
    ),
    pool.query(
      `SELECT v.id_venta, v.fecha_venta, v.tipo_venta, v.total_productos,
              v.id_sesion, u.nombre AS nombre_usuario
       FROM ventas v JOIN usuarios u ON u.id_usuario = v.id_usuario
       WHERE v.id_sucursal = $1 AND v.fecha_venta >= date_trunc('day', NOW())
         ${userId ? 'AND v.id_usuario = $2' : ''}
       ORDER BY v.fecha_venta DESC LIMIT 5`,
      salesValues,
    ),
    pool.query(
      `SELECT COALESCE(SUM(sm.total_tiempo), 0)::NUMERIC(12,2) AS ingresos_alquiler
       FROM sesiones_mesa sm
       JOIN mesas m ON m.id_mesa = sm.id_mesa
       WHERE m.id_sucursal = $1
         AND sm.estado = 'finalizada'
         AND sm.hora_fin >= date_trunc('day', NOW())
         ${userId ? 'AND sm.id_usuario = $2' : ''}`,
      rentalValues,
    ),
  ]);

  const salesRow = sales.rows[0] || {};
  const cashRow = cash.rows[0] || {};
  const rentalIncome = Number(rental.rows[0]?.ingresos_alquiler || 0);
  const productIncome = Number(salesRow.total || 0);
  const baseAbierta = Number(cashRow.base_abierta || 0);

  return {
    tables: tables.rows[0] || {},
    sessions: sessions.rows,
    sales: salesRow,
    cash: {
      ...cashRow,
      efectivo_esperado: Number((baseAbierta + rentalIncome + productIncome).toFixed(2)),
    },
    income: {
      alquileres: rentalIncome,
      productos: productIncome,
      total: Number((rentalIncome + productIncome).toFixed(2)),
    },
    recentSales: recentSales.rows,
  };
}

module.exports = { findSummary };
