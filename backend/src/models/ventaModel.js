const { pool } = require('../config/db');

async function create({ id_sucursal, id_usuario, id_sesion, tipo_venta, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const operator = await client.query(
      'SELECT 1 FROM usuarios WHERE id_usuario = $1 AND id_sucursal = $2 AND activo = TRUE',
      [id_usuario, id_sucursal]
    );
    if (!operator.rowCount) {
      const error = new Error('El usuario no está activo o no pertenece a la sucursal indicada.');
      error.status = 400;
      error.code = 'INVALID_BRANCH_OPERATOR';
      throw error;
    }

    if (id_sesion) {
      const session = await client.query(
        `SELECT 1 FROM sesiones_mesa sm
         JOIN mesas m ON m.id_mesa = sm.id_mesa
         WHERE sm.id_sesion = $1 AND m.id_sucursal = $2
           AND sm.estado IN ('activa', 'pausada')
         FOR UPDATE OF sm`,
        [id_sesion, id_sucursal]
      );
      if (!session.rowCount) {
        const error = new Error('La sesión no está activa o no pertenece a la sucursal indicada.');
        error.status = 400;
        error.code = 'INVALID_SALE_SESSION';
        throw error;
      }
    }

    const sale = await client.query(
      `INSERT INTO ventas (tipo_venta, id_sucursal, id_usuario, id_sesion)
       VALUES ($1, $2, $3, $4)
       RETURNING id_venta, fecha_venta, tipo_venta, total_productos, id_sesion, id_sucursal, id_usuario`,
      [tipo_venta, id_sucursal, id_usuario, id_sesion || null]
    );

    let totalCents = 0;
    const details = [];
    for (const item of items) {
      const productResult = await client.query(
        `SELECT id_producto, nombre, precio_venta, stock
         FROM productos
         WHERE id_producto = $1 AND id_sucursal = $2 AND activo = TRUE
         FOR UPDATE`,
        [item.id_producto, id_sucursal]
      );
      const product = productResult.rows[0];
      if (!product) {
        const error = new Error(`El producto ${item.id_producto} no existe en la sucursal indicada.`);
        error.status = 400;
        error.code = 'INVALID_SALE_PRODUCT';
        throw error;
      }
      if (product.stock < item.cantidad) {
        const error = new Error(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}.`);
        error.status = 409;
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }

      const priceCents = Math.round(Number(product.precio_venta) * 100);
      const subtotalCents = priceCents * item.cantidad;
      if (!Number.isSafeInteger(subtotalCents)) {
        const error = new Error('El importe de la venta supera el rango permitido.');
        error.status = 400;
        error.code = 'SALE_AMOUNT_OUT_OF_RANGE';
        throw error;
      }

      await client.query(
        `UPDATE productos SET stock = stock - $2, actualizado_en = NOW()
         WHERE id_producto = $1`,
        [item.id_producto, item.cantidad]
      );
      const detail = await client.query(
        `INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_detalle, id_producto, cantidad, precio_unitario, subtotal`,
        [sale.rows[0].id_venta, item.id_producto, item.cantidad, priceCents / 100, subtotalCents / 100]
      );
      details.push({ ...detail.rows[0], nombre: product.nombre });
      totalCents += subtotalCents;
    }

    const total = await client.query(
      `UPDATE ventas SET total_productos = $2
       WHERE id_venta = $1
       RETURNING id_venta, fecha_venta, tipo_venta, total_productos, id_sesion, id_sucursal, id_usuario`,
      [sale.rows[0].id_venta, totalCents / 100]
    );
    await client.query('COMMIT');
    return { ...total.rows[0], detalles: details };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findAll({ branchId, limit = 50 } = {}) {
  const values = [];
  const conditions = [];
  if (branchId) {
    values.push(branchId);
    conditions.push(`v.id_sucursal = $${values.length}`);
  }
  values.push(limit);
  const { rows } = await pool.query(
    `SELECT v.id_venta, v.fecha_venta, v.tipo_venta, v.total_productos,
            v.id_sesion, v.id_sucursal, v.id_usuario,
            s.nombre AS nombre_sucursal, u.nombre AS nombre_usuario,
            COALESCE(detalles.items, '[]'::json) AS detalles
     FROM ventas v
     JOIN sucursales s ON s.id_sucursal = v.id_sucursal
     JOIN usuarios u ON u.id_usuario = v.id_usuario
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object(
         'id_detalle', dv.id_detalle,
         'id_producto', dv.id_producto,
         'nombre', p.nombre,
         'cantidad', dv.cantidad,
         'precio_unitario', dv.precio_unitario,
         'subtotal', dv.subtotal
       ) ORDER BY dv.id_detalle) AS items
       FROM detalle_ventas dv
       JOIN productos p ON p.id_producto = dv.id_producto
       WHERE dv.id_venta = v.id_venta
     ) detalles ON TRUE
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY v.fecha_venta DESC
     LIMIT $${values.length}`,
    values
  );
  return rows;
}

module.exports = { create, findAll };
