const path = require('node:path');
const dotenv = require('dotenv');
const { hashPassword } = require('../src/config/auth');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { pool, isDatabaseConfigured, close } = require('../src/config/db');

async function seed() {
  if (!isDatabaseConfigured || !pool) {
    console.error('DATABASE_URL no está configurado. Copia backend/.env.example a backend/.env y define la conexión antes de ejecutar el seed.');
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sucursales = [
      { id_sucursal: 1, nombre: 'Bola8 Centro', direccion: 'Calle 5 #120', telefono: '7001001', estado: true },
      { id_sucursal: 2, nombre: 'Bola8 Norte', direccion: 'Av. Rosales 88', telefono: '7002002', estado: true },
    ];

    await Promise.all(sucursales.map((branch) => client.query(
      `INSERT INTO sucursales (id_sucursal, nombre, direccion, telefono, estado, creado_en, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id_sucursal) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         direccion = EXCLUDED.direccion,
         telefono = EXCLUDED.telefono,
         estado = EXCLUDED.estado,
         actualizado_en = NOW()`,
      [branch.id_sucursal, branch.nombre, branch.direccion, branch.telefono, branch.estado]
    )));

    const usuarios = [
      { id_usuario: 1, nombre: 'Admin General', email: 'admin@bola8.com', password_hash: await hashPassword('Bola8Admin2026!'), rol: 'admin_general', id_sucursal: null, activo: true },
      { id_usuario: 2, nombre: 'Marta Salas', email: 'marta@bola8.com', password_hash: await hashPassword('MartaBola8-2026'), rol: 'admin_sucursal', id_sucursal: 1, activo: true },
      { id_usuario: 3, nombre: 'Juan Pérez', email: 'juan@bola8.com', password_hash: await hashPassword('JuanBola8-2026!'), rol: 'cajero', id_sucursal: 1, activo: true },
      { id_usuario: 4, nombre: 'Clara Rojas', email: 'clara@bola8.com', password_hash: await hashPassword('ClaraBola8-2026!'), rol: 'cajero', id_sucursal: 2, activo: true },
    ];

    await Promise.all(usuarios.map((user) => client.query(
      `INSERT INTO usuarios (id_usuario, nombre, email, password_hash, rol, id_sucursal, activo, creado_en, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (id_usuario) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         rol = EXCLUDED.rol,
         id_sucursal = EXCLUDED.id_sucursal,
         activo = EXCLUDED.activo,
         actualizado_en = NOW()`,
      [user.id_usuario, user.nombre, user.email, user.password_hash, user.rol, user.id_sucursal, user.activo]
    )));

    const categorias = [
      { id_categoria: 1, nombre: 'Bebidas' },
      { id_categoria: 2, nombre: 'Snacks' },
      { id_categoria: 3, nombre: 'Frituras' },
      { id_categoria: 4, nombre: 'Accesorios' },
    ];

    await Promise.all(categorias.map((category) => client.query(
      `INSERT INTO categorias (id_categoria, nombre, descripcion, creado_en)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id_categoria) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         descripcion = EXCLUDED.descripcion`,
      [category.id_categoria, category.nombre, `Categoría ${category.nombre.toLowerCase()}`]
    )));

    const productos = [
      { id_producto: 1, nombre: 'Coca Cola 600ml', precio_venta: 8.5, stock: 40, stock_minimo: 8, id_categoria: 1, id_sucursal: 1, activo: true },
      { id_producto: 2, nombre: 'Fanta 600ml', precio_venta: 6.0, stock: 28, stock_minimo: 6, id_categoria: 1, id_sucursal: 1, activo: true },
      { id_producto: 3, nombre: 'Agua 500ml', precio_venta: 5.0, stock: 50, stock_minimo: 10, id_categoria: 1, id_sucursal: 1, activo: true },
      { id_producto: 4, nombre: 'Chips Sal', precio_venta: 9.0, stock: 18, stock_minimo: 5, id_categoria: 2, id_sucursal: 1, activo: true },
      { id_producto: 5, nombre: 'Papas fritas', precio_venta: 12.0, stock: 15, stock_minimo: 4, id_categoria: 3, id_sucursal: 1, activo: true },
      { id_producto: 6, nombre: 'Cerveza Corona', precio_venta: 22.0, stock: 30, stock_minimo: 8, id_categoria: 1, id_sucursal: 2, activo: true },
      { id_producto: 7, nombre: 'Cerveza Pilsener', precio_venta: 18.0, stock: 35, stock_minimo: 10, id_categoria: 1, id_sucursal: 2, activo: true },
      { id_producto: 8, nombre: 'Nachos', precio_venta: 16.0, stock: 12, stock_minimo: 4, id_categoria: 2, id_sucursal: 2, activo: true },
      { id_producto: 9, nombre: 'Palos de billar', precio_venta: 120.0, stock: 5, stock_minimo: 2, id_categoria: 4, id_sucursal: 1, activo: true },
      { id_producto: 10, nombre: 'Tacos de mesa', precio_venta: 90.0, stock: 8, stock_minimo: 3, id_categoria: 4, id_sucursal: 2, activo: true },
    ];

    await Promise.all(productos.map((product) => client.query(
      `INSERT INTO productos (id_producto, nombre, precio_venta, stock, stock_minimo, id_categoria, id_sucursal, activo, creado_en, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id_producto) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         precio_venta = EXCLUDED.precio_venta,
         stock = EXCLUDED.stock,
         stock_minimo = EXCLUDED.stock_minimo,
         id_categoria = EXCLUDED.id_categoria,
         id_sucursal = EXCLUDED.id_sucursal,
         activo = EXCLUDED.activo,
         actualizado_en = NOW()`,
      [product.id_producto, product.nombre, product.precio_venta, product.stock, product.stock_minimo, product.id_categoria, product.id_sucursal, product.activo]
    )));

    const mesas = [
      { id_mesa: 1, numero_mesa: 'M1', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'libre', id_sucursal: 1 },
      { id_mesa: 2, numero_mesa: 'M2', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'ocupada', id_sucursal: 1 },
      { id_mesa: 3, numero_mesa: 'M3', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'libre', id_sucursal: 1 },
      { id_mesa: 4, numero_mesa: 'M4', tipo_mesa: 'Snooker', tarifa_minuto: 3.0, estado: 'mantenimiento', id_sucursal: 1 },
      { id_mesa: 5, numero_mesa: 'M5', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'libre', id_sucursal: 2 },
      { id_mesa: 6, numero_mesa: 'M6', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'ocupada', id_sucursal: 2 },
      { id_mesa: 7, numero_mesa: 'M7', tipo_mesa: 'Snooker', tarifa_minuto: 3.0, estado: 'libre', id_sucursal: 2 },
      { id_mesa: 8, numero_mesa: 'M8', tipo_mesa: 'Pool', tarifa_minuto: 2.5, estado: 'libre', id_sucursal: 2 },
    ];

    await Promise.all(mesas.map((table) => client.query(
      `INSERT INTO mesas (id_mesa, numero_mesa, tipo_mesa, tarifa_minuto, estado, activa, id_sucursal, creado_en, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW())
       ON CONFLICT (id_mesa) DO UPDATE SET
         numero_mesa = EXCLUDED.numero_mesa,
         tipo_mesa = EXCLUDED.tipo_mesa,
         tarifa_minuto = EXCLUDED.tarifa_minuto,
         estado = EXCLUDED.estado,
         activa = TRUE,
         id_sucursal = EXCLUDED.id_sucursal,
         actualizado_en = NOW()`,
      [table.id_mesa, table.numero_mesa, table.tipo_mesa, table.tarifa_minuto, table.estado, table.id_sucursal]
    )));

    const sesiones = [
      { id_sesion: 1, id_mesa: 2, id_usuario: 3, tarifa_minuto: 2.5, hora_inicio: '2026-11-09T18:00:00Z', estado: 'activa', minutos_totales: 0, total_tiempo: 0, segundos_pausa: 0 },
      { id_sesion: 2, id_mesa: 6, id_usuario: 4, tarifa_minuto: 2.5, hora_inicio: '2026-11-09T17:30:00Z', estado: 'pausada', pausada_en: '2026-11-09T18:15:00Z', minutos_totales: 22, total_tiempo: 22.0, segundos_pausa: 180, },
      { id_sesion: 3, id_mesa: 1, id_usuario: 3, tarifa_minuto: 2.5, hora_inicio: '2026-11-08T19:30:00Z', hora_fin: '2026-11-08T20:45:00Z', estado: 'finalizada', minutos_totales: 75, total_tiempo: 75.0, segundos_pausa: 0 },
    ];

    await Promise.all(sesiones.map((session) => client.query(
      `INSERT INTO sesiones_mesa (
         id_sesion, id_mesa, id_usuario, tarifa_minuto, hora_inicio, hora_fin,
         pausada_en, segundos_pausa, minutos_totales, total_tiempo, estado, creado_en
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (id_sesion) DO UPDATE SET
         id_mesa = EXCLUDED.id_mesa,
         id_usuario = EXCLUDED.id_usuario,
         tarifa_minuto = EXCLUDED.tarifa_minuto,
         hora_inicio = EXCLUDED.hora_inicio,
         hora_fin = EXCLUDED.hora_fin,
         pausada_en = EXCLUDED.pausada_en,
         segundos_pausa = EXCLUDED.segundos_pausa,
         minutos_totales = EXCLUDED.minutos_totales,
         total_tiempo = EXCLUDED.total_tiempo,
         estado = EXCLUDED.estado`,
      [session.id_sesion, session.id_mesa, session.id_usuario, session.tarifa_minuto, session.hora_inicio, session.hora_fin || null, session.pausada_en || null, session.segundos_pausa, session.minutos_totales, session.total_tiempo, session.estado]
    )));

    const ventas = [
      { id_venta: 1, fecha_venta: '2026-11-09T18:05:00Z', tipo_venta: 'directa', total_productos: 44.5, id_sesion: null, id_sucursal: 1, id_usuario: 3 },
      { id_venta: 2, fecha_venta: '2026-11-09T18:40:00Z', tipo_venta: 'mesa', total_productos: 52.0, id_sesion: 1, id_sucursal: 1, id_usuario: 3 },
      { id_venta: 3, fecha_venta: '2026-11-09T19:10:00Z', tipo_venta: 'directa', total_productos: 23.0, id_sesion: null, id_sucursal: 2, id_usuario: 4 },
    ];

    await Promise.all(ventas.map((sale) => client.query(
      `INSERT INTO ventas (id_venta, fecha_venta, tipo_venta, total_productos, id_sesion, id_sucursal, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id_venta) DO UPDATE SET
         fecha_venta = EXCLUDED.fecha_venta,
         tipo_venta = EXCLUDED.tipo_venta,
         total_productos = EXCLUDED.total_productos,
         id_sesion = EXCLUDED.id_sesion,
         id_sucursal = EXCLUDED.id_sucursal,
         id_usuario = EXCLUDED.id_usuario`,
      [sale.id_venta, sale.fecha_venta, sale.tipo_venta, sale.total_productos, sale.id_sesion, sale.id_sucursal, sale.id_usuario]
    )));

    const detalleVentas = [
      { id_detalle: 1, id_venta: 1, id_producto: 1, cantidad: 2, precio_unitario: 8.5, subtotal: 17.0 },
      { id_detalle: 2, id_venta: 1, id_producto: 4, cantidad: 3, precio_unitario: 9.0, subtotal: 27.5 },
      { id_detalle: 3, id_venta: 2, id_producto: 2, cantidad: 2, precio_unitario: 6.0, subtotal: 12.0 },
      { id_detalle: 4, id_venta: 2, id_producto: 5, cantidad: 2, precio_unitario: 12.0, subtotal: 24.0 },
      { id_detalle: 5, id_venta: 2, id_producto: 1, cantidad: 2, precio_unitario: 8.5, subtotal: 17.0 },
      { id_detalle: 6, id_venta: 3, id_producto: 8, cantidad: 1, precio_unitario: 16.0, subtotal: 16.0 },
      { id_detalle: 7, id_venta: 3, id_producto: 7, cantidad: 1, precio_unitario: 18.0, subtotal: 18.0 },
      { id_detalle: 8, id_venta: 3, id_producto: 3, cantidad: 1, precio_unitario: 5.0, subtotal: 5.0 },
    ];

    await Promise.all(detalleVentas.map((detail) => client.query(
      `INSERT INTO detalle_ventas (id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_detalle) DO UPDATE SET
         id_venta = EXCLUDED.id_venta,
         id_producto = EXCLUDED.id_producto,
         cantidad = EXCLUDED.cantidad,
         precio_unitario = EXCLUDED.precio_unitario,
         subtotal = EXCLUDED.subtotal`,
      [detail.id_detalle, detail.id_venta, detail.id_producto, detail.cantidad, detail.precio_unitario, detail.subtotal]
    )));

    const reservas = [
      { id_reserva: 1, nombre_cliente: 'Pedro Gómez', telefono_cliente: '7001112', fecha_reserva: '2026-11-10', hora_inicio: '20:00', duracion_minutos: 90, estado: 'pendiente', id_mesa: 1 },
      { id_reserva: 2, nombre_cliente: 'María López', telefono_cliente: '7013334', fecha_reserva: '2026-11-10', hora_inicio: '19:30', duracion_minutos: 120, estado: 'confirmada', id_mesa: 5 },
      { id_reserva: 3, nombre_cliente: 'Luis Mena', telefono_cliente: '7024455', fecha_reserva: '2026-11-11', hora_inicio: '18:00', duracion_minutos: 60, estado: 'cancelada', id_mesa: 6 },
    ];

    await Promise.all(reservas.map((reservation) => client.query(
      `INSERT INTO reservas (id_reserva, nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio, duracion_minutos, estado, id_mesa, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id_reserva) DO UPDATE SET
         nombre_cliente = EXCLUDED.nombre_cliente,
         telefono_cliente = EXCLUDED.telefono_cliente,
         fecha_reserva = EXCLUDED.fecha_reserva,
         hora_inicio = EXCLUDED.hora_inicio,
         duracion_minutos = EXCLUDED.duracion_minutos,
         estado = EXCLUDED.estado,
         id_mesa = EXCLUDED.id_mesa`,
      [reservation.id_reserva, reservation.nombre_cliente, reservation.telefono_cliente, reservation.fecha_reserva, reservation.hora_inicio, reservation.duracion_minutos, reservation.estado, reservation.id_mesa]
    )));

    const turnos = [
      { id_caja: 1, fecha_apertura: '2026-11-09T09:00:00Z', fecha_cierre: '2026-11-09T13:00:00Z', monto_inicial: 250.0, total_calculado: 480.0, monto_declarado: 520.0, estado: 'cerrada', id_usuario: 3, id_sucursal: 1 },
      { id_caja: 2, fecha_apertura: '2026-11-09T13:30:00Z', fecha_cierre: null, monto_inicial: 300.0, total_calculado: 120.0, monto_declarado: null, estado: 'abierta', id_usuario: 4, id_sucursal: 2 },
    ];

    await Promise.all(turnos.map((shift) => client.query(
      `INSERT INTO caja_turnos (id_caja, fecha_apertura, fecha_cierre, monto_inicial, total_calculado, monto_declarado, estado, id_usuario, id_sucursal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id_caja) DO UPDATE SET
         fecha_apertura = EXCLUDED.fecha_apertura,
         fecha_cierre = EXCLUDED.fecha_cierre,
         monto_inicial = EXCLUDED.monto_inicial,
         total_calculado = EXCLUDED.total_calculado,
         monto_declarado = EXCLUDED.monto_declarado,
         estado = EXCLUDED.estado,
         id_usuario = EXCLUDED.id_usuario,
         id_sucursal = EXCLUDED.id_sucursal`,
      [shift.id_caja, shift.fecha_apertura, shift.fecha_cierre, shift.monto_inicial, shift.total_calculado, shift.monto_declarado, shift.estado, shift.id_usuario, shift.id_sucursal]
    )));

    await client.query('COMMIT');
    console.log('Seed ejecutado correctamente: sucursales, usuarios, catálogo, productos, mesas, sesiones, ventas, reservas y caja cargados.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al ejecutar el seed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await close();
  }
}

seed();
