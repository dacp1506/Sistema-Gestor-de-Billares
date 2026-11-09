# Bola8

Sistema de gestión multi-sucursal para salones de billar. El backend REST está organizado bajo `backend/` con arquitectura MVC y el cliente multiplataforma React Native / Expo vive en `frontend/`. La maqueta HTML de `views/index.html` se conserva como referencia visual.

## Requisitos

- Node.js 20 o posterior.
- PostgreSQL (Supabase o una instalación local).

## Configuración

1. Instala las dependencias: `npm --prefix backend install` y `npm --prefix frontend install`.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL`, `DATABASE_SSL` y un `JWT_SECRET` aleatorio. Puedes generarlo con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`; no lo compartas ni lo subas al repositorio. Además, deja `HOST=0.0.0.0` para que el backend sea accesible desde el teléfono o desde la red local. Para validar el certificado de Supabase, descarga su certificado raíz desde Database Settings → SSL Configuration, guárdalo como `backend/certs/supabase-root.crt` y configura `DATABASE_SSL_CA=certs/supabase-root.crt`.
3. Copia `frontend/.env.example` a `frontend/.env`. Para navegador local conserva `http://127.0.0.1:3000/api`; si ejecutas la app en un teléfono, cambia el valor por la IP local de tu PC (por ejemplo `http://192.168.1.20:3000/api`).
4. Ejecuta `backend/database/schema.sql` en Supabase o con `psql`.
5. En una base nueva, ejecuta el seed de ejemplo desde `backend/` con `node database/seed.js` para cargar datos de prueba. No lo ejecutes sobre una base que ya tenga datos operativos: el seed usa identificadores fijos.
6. Si no existe un usuario `admin_general` activo, ejecuta `node database/create-admin.js` desde `backend/` en una terminal interactiva. El comando pide nombre, correo y contraseña oculta; no crea usuarios vía HTTP ni imprime la contraseña.
7. Inicia el backend desde la raíz con `npm start`.
8. Inicia el cliente web con `npm run frontend:web` o la aplicación móvil con `npm run frontend:android` / `npm run frontend:ios`.

Las configuraciones locales `backend/.env` y `frontend/.env` no se incluyen en el repositorio. La primera pantalla Expo presenta Productos/Inventario y consume la API; `views/index.html` y sus datos en memoria se conservan solo como referencia visual.

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
frontend/
  App.tsx
  app.json
  index.ts
  package.json
  src/
    components/
    screens/
    services/
    theme.ts
```

Los controladores implementados abarcan sucursales, mesas, productos, sesiones de mesa y ventas POS. Los modelos ejecutan consultas parametrizadas; ventas y control de sesiones usan transacciones PostgreSQL.

El cliente Expo se generó con la plantilla TypeScript en blanco y se habilitó el runtime para web. El primer módulo implementa listado, búsqueda, alta, edición y desactivación de productos. Sus solicitudes están centralizadas en servicios API.

También se incluye un seed de ejemplo en `backend/database/seed.js` para cargar datos de prueba útiles en sucursales, usuarios, productos, mesas, sesiones, ventas, reservas y turnos de caja. Esto permite validar cada flujo sin tener que crear registros a mano desde la interfaz.

## API disponible

- `POST /api/auth/login` — autentica por email y contraseña y devuelve JWT.
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
- `GET|POST /api/reservas` — listar y crear reservas por sucursal o fecha.
- `GET /api/reservas/:id` y `PATCH /api/reservas/:id/estado` — consultar y actualizar estado de una reserva.

Todos los endpoints `/api` excepto `POST /api/auth/login` requieren `Authorization: Bearer <token>`. Las cuentas `admin_general` pueden consultar todas las sucursales y administrar usuarios y sucursales; `admin_sucursal` y `cajero` quedan limitados a la sucursal de su cuenta. La administración de productos y mesas requiere rol administrador. Las operaciones de venta, caja y sesión usan el usuario del token y no el identificador de usuario enviado por el cliente.

Para registrar ventas se requieren `id_sucursal`, `id_usuario`, `tipo_venta` (`directa` o `mesa`), `id_sesion` solo para venta de mesa e `items` con `id_producto` y `cantidad`. El precio se consulta en la base de datos y el stock se valida y descuenta dentro de la transacción.

Las reservas validan mesa activa, horario válido y conflicto de solapamiento dentro de la misma mesa para evitar duplicados en la misma franja.

## Credenciales demo

El seed crea usuarios de ejemplo con contraseñas reales para probar el flujo de autenticación:

- `admin@bola8.com` / `Bola8Admin2026!`
- `marta@bola8.com` / `MartaBola8-2026`
- `juan@bola8.com` / `JuanBola8-2026!`
- `clara@bola8.com` / `ClaraBola8-2026!`

## Validación

```bash
npm run check
```

Ejecuta `npm run frontend:web` para abrir Expo en navegador. Las pruebas unitarias y de tipos no requieren base de datos. Para acceder a la API, configura PostgreSQL en `backend/.env`; si PostgreSQL no está disponible o el URI apunta a una base inexistente, la API devuelve un error `503` sanitizado. CORS permite por defecto solo los orígenes locales de Expo `http://localhost:8081` y `http://127.0.0.1:8081`; modifica `FRONTEND_ORIGINS` en `backend/.env` si cambian.

El cliente Expo presenta una pantalla de login y añade el JWT a las llamadas API. La configuración de firma se toma de `JWT_SECRET`; en producción el servidor no inicia si falta. Las contraseñas nuevas usan scrypt con sal aleatoria; los hashes SHA-256 heredados se actualizan automáticamente al iniciar sesión correctamente. Antes de operaciones reales, habilita HTTPS, limita intentos de login y completa pruebas de permisos con una base de datos.
