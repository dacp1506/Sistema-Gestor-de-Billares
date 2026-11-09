const { pool } = require('../config/db');

async function findByBranch(branchId) {
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre, p.precio_venta, p.stock, p.stock_minimo,
            p.id_sucursal, c.nombre AS categoria
     FROM productos p
     LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
     WHERE p.id_sucursal = $1 AND p.activo = TRUE
     ORDER BY p.nombre, p.id_producto`,
    [branchId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre, p.precio_venta, p.stock, p.stock_minimo,
            p.id_sucursal, c.nombre AS categoria
     FROM productos p
     LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
     WHERE p.id_producto = $1 AND p.activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

async function create({ nombre, precio_venta, stock, stock_minimo, id_sucursal, categoria }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categoryId = await getOrCreateCategory(client, categoria);
    const { rows } = await client.query(
      `INSERT INTO productos
         (nombre, precio_venta, stock, stock_minimo, id_sucursal, id_categoria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_producto, nombre, precio_venta, stock, stock_minimo, id_sucursal`,
      [nombre, precio_venta, stock, stock_minimo, id_sucursal, categoryId]
    );
    await client.query('COMMIT');
    return { ...rows[0], categoria };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, { nombre, precio_venta, stock, stock_minimo, categoria }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categoryId = await getOrCreateCategory(client, categoria);
    const { rows } = await client.query(
      `UPDATE productos
       SET nombre = $2, precio_venta = $3, stock = $4, stock_minimo = $5,
           id_categoria = $6, actualizado_en = NOW()
       WHERE id_producto = $1 AND activo = TRUE
       RETURNING id_producto, nombre, precio_venta, stock, stock_minimo, id_sucursal`,
      [id, nombre, precio_venta, stock, stock_minimo, categoryId]
    );
    await client.query('COMMIT');
    return rows[0] ? { ...rows[0], categoria } : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deactivate(id) {
  const { rows } = await pool.query(
    `UPDATE productos SET activo = FALSE, actualizado_en = NOW()
     WHERE id_producto = $1 AND activo = TRUE
     RETURNING id_producto, nombre, precio_venta, stock, stock_minimo, id_sucursal`,
    [id]
  );
  return rows[0] || null;
}

async function getOrCreateCategory(client, name) {
  if (!name) return null;
  const { rows } = await client.query(
    `INSERT INTO categorias (nombre)
     VALUES ($1)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id_categoria`,
    [name]
  );
  return rows[0].id_categoria;
}

module.exports = { findByBranch, findById, create, update, deactivate };
