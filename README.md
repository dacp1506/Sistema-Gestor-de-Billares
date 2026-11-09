# Bola8

Sistema de gestión multi-sucursal para salones de billar. El backend está organizado bajo `backend/` con arquitectura MVC; la interfaz de demostración se mantiene en `views/index.html`.

## Requisitos

- Node.js 20 o posterior.
- PostgreSQL (Supabase o una instalación local).

## Configuración

1. Instala las dependencias del backend: `npm --prefix backend install`.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL` y `DATABASE_SSL`.
3. Ejecuta `backend/database/schema.sql` en Supabase o con `psql`.
4. Inicia el servidor desde la raíz con `npm start` o `npm run dev`. También puedes ejecutar los comandos desde `backend/`.
5. Abre <http://127.0.0.1:3000>.

La configuración local `backend/.env` no se incluye en el repositorio. La aplicación web sigue siendo una maqueta de demostración en memoria; no se conecta aún con los endpoints del backend.

## Estructura

```text
backend/
  .env.example
  .gitignore
  package.json
  database/schema.sql
  src/
    config/db.js
    controllers/
      sucursalController.js
      mesaController.js
      productoController.js
      sesionController.js
      finanzasController.js
    middlewares/
    models/
    routes/
    app.js
    server.js
  tests/
views/
  index.html
```

Los controladores implementados abarcan sucursales, mesas, productos, sesiones de mesa y ventas POS. Los modelos ejecutan consultas parametrizadas; ventas y control de sesiones usan transacciones PostgreSQL.

## API disponible

- `GET /api/health` — estado del servidor y conexión a base de datos.
- `GET|POST /api/sucursales` — listar y crear sucursales.
- `GET|PUT|DELETE /api/sucursales/:id` — consultar, actualizar y desactivar sucursales.
- `GET /api/mesas/sucursal/:id_sucursal` — listar mesas activas de una sucursal.
- `GET|POST /api/mesas` y `GET|PUT|DELETE /api/mesas/:id` — administrar mesas.
- `GET /api/productos?id_sucursal=:id` — listar el inventario de una sucursal.
- `GET|POST /api/productos` y `GET|PUT|DELETE /api/productos/:id` — administrar productos.
- `GET|POST /api/ventas` — historial y registro transaccional POS.
- `GET /api/sesiones` y `/api/sesiones/activas` — consultar sesiones.
- `POST /api/sesiones` y `PATCH /api/sesiones/:id/{pausar,reanudar,finalizar}` — controlar cronómetros.

Para registrar ventas se requieren `id_sucursal`, `id_usuario`, `tipo_venta` (`directa` o `mesa`), `id_sesion` solo para venta de mesa e `items` con `id_producto` y `cantidad`. El precio se consulta en la base de datos y el stock se valida y descuenta dentro de la transacción.

## Validación

```bash
npm run check
```

Las pruebas unitarias no requieren base de datos. Para acceder a la API, configura PostgreSQL en `backend/.env`; sin esa configuración, la API responde `503 DATABASE_NOT_CONFIGURED` en lugar de simular persistencia.

Autenticación/JWT, roles, reservas, caja y la integración de la interfaz con la API quedan como siguientes etapas; esta entrega no debe usarse con operaciones reales.
