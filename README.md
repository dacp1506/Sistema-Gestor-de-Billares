# Bola8

Sistema de gestión multi-sucursal para salones de billar. El backend REST está organizado bajo `backend/` con arquitectura MVC y el cliente multiplataforma React Native / Expo vive en `frontend/`. La maqueta HTML de `views/index.html` se conserva como referencia visual.

## Requisitos

- Node.js 20 o posterior.
- PostgreSQL (Supabase o una instalación local).

## Configuración

1. Instala las dependencias: `npm --prefix backend install` y `npm --prefix frontend install`.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL`, `DATABASE_SSL=true` y un `JWT_SECRET` aleatorio. Puedes generarlo con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`; no lo compartas ni lo subas al repositorio. El backend usa HTTP `PORT=3000` por defecto; configura `HOST=0.0.0.0` para acceder desde un teléfono o la red local. El puerto PostgreSQL `5432` es para la base de datos, no para el servidor HTTP. Para validar el certificado de Supabase, descarga su certificado raíz desde Database Settings → SSL Configuration, guárdalo como `backend/certs/supabase-root.crt` y configura `DATABASE_SSL_CA=certs/supabase-root.crt`.
3. Copia `frontend/.env.example` a `frontend/.env`. Para navegador local conserva `http://127.0.0.1:3000/api`; para un teléfono, usa la IP LAN del PC y el puerto HTTP del backend (por ejemplo `http://192.168.1.20:3000/api`). No pongas la contraseña de Supabase ni `JWT_SECRET` en variables `EXPO_PUBLIC_*`.
4. Ejecuta `backend/database/schema.sql` en Supabase o con `psql`.
5. No ejecutes `backend/database/seed.js` en Supabase ni en una base con datos reales: contiene identificadores fijos, cuentas de demostración y movimientos ficticios. Crea el catálogo desde la interfaz o inserta únicamente datos base revisados con SQL; las ventas, reservas, sesiones y turnos deben generarse por operaciones reales.
6. Si no existe un usuario `admin_general` activo, ejecuta `node database/create-admin.js` desde `backend/` en una terminal interactiva. El comando pide nombre, correo y contraseña oculta; no crea usuarios vía HTTP ni imprime la contraseña.
7. Desde la raíz del repositorio, inicia el backend con `npm start`; con la configuración de ejemplo queda en `http://localhost:3000`.
8. Inicia Expo Web con `npm run frontend:web` o la app móvil con `npm run frontend:android` / `npm run frontend:ios`. Abre la URL que informa Expo (habitualmente `http://localhost:8081`).

Las configuraciones locales `backend/.env` y `frontend/.env` no se incluyen en el repositorio. Expo presenta primero el login; después del inicio de sesión ofrece Mesas y sesiones, Caja/ventas, Reservas, Inventario y Usuarios según el rol. Las pantallas consumen la API REST. `views/index.html` y sus datos en memoria se conservan solo como referencia visual.

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

Los controladores implementados abarcan sucursales, usuarios, mesas, productos, sesiones, reservas, caja y ventas POS. Los modelos usan consultas parametrizadas; las operaciones de ventas mantienen transacciones PostgreSQL.

El cliente Expo se generó con la plantilla TypeScript en blanco y se habilitó el runtime web. Incluye login JWT y pantallas para inventario, mesas/sesiones, caja/ventas POS, reservas y usuarios. Sus solicitudes están centralizadas en servicios API.

`backend/database/seed.js` es un seed legado y no debe ejecutarse hasta corregirlo y validarlo: usa IDs fijos, cuentas de demostración y actividad ficticia; además, un detalle de venta no cumple la restricción de subtotal del esquema. Para datos reales, crea el catálogo desde la interfaz o usa SQL revisado.

## API disponible

- `POST /api/auth/login` — autentica por email y contraseña y devuelve JWT.
- `GET /api/health` — estado del servidor y conexión a base de datos.
- `GET|POST /api/sucursales` — listar y crear sucursales.
- `GET|PUT|DELETE /api/sucursales/:id` — consultar, actualizar y desactivar sucursales.
- `GET /api/mesas/sucursal/:id_sucursal` — listar mesas activas de una sucursal.
- `GET|POST /api/mesas` y `GET|PUT|DELETE /api/mesas/:id` — administrar mesas.
- `GET /api/productos?id_sucursal=:id` — listar el inventario de una sucursal.
- `GET|POST /api/productos` y `GET|PUT|DELETE /api/productos/:id` — administrar productos.
- `GET|POST /api/usuarios` y `GET|PUT|DELETE /api/usuarios/:id` — administrar usuarios (solo `admin_general`).
- `GET /api/caja`, `POST /api/caja/apertura` y `PATCH /api/caja/:id/cerrar` — consultar y controlar turnos de caja.
- `GET|POST /api/ventas` — historial y registro transaccional POS.
- `GET /api/sesiones` y `/api/sesiones/activas` — consultar sesiones.
- `POST /api/sesiones` y `PATCH /api/sesiones/:id/{pausar,reanudar,finalizar}` — controlar cronómetros.
- `GET|POST /api/reservas` — listar y crear reservas por sucursal o fecha.
- `GET /api/reservas/:id` y `PATCH /api/reservas/:id/estado` — consultar y actualizar estado de una reserva.

Todos los endpoints `/api` excepto `POST /api/auth/login` requieren `Authorization: Bearer <token>`. Las cuentas `admin_general` pueden consultar todas las sucursales y administrar usuarios y sucursales; `admin_sucursal` y `cajero` quedan limitados a la sucursal de su cuenta. La administración de productos y mesas requiere rol administrador. Las operaciones de venta, caja y sesión usan el usuario del token y no el identificador de usuario enviado por el cliente.

Para registrar ventas se requieren `id_sucursal`, `id_usuario`, `tipo_venta` (`directa` o `mesa`), `id_sesion` solo para venta de mesa e `items` con `id_producto` y `cantidad`. El precio se consulta en la base de datos y el stock se valida y descuenta dentro de la transacción.

Las reservas validan mesa activa, horario válido y conflicto de solapamiento dentro de la misma mesa para evitar duplicados en la misma franja.

## Acceso inicial

No se publican credenciales de demostración. En una base nueva, crea el primer administrador mediante `node database/create-admin.js` desde `backend/`; el script solicita la contraseña de forma interactiva y la almacena como hash.

## Validación

```bash
npm run check
```

`npm run check` ejecuta las pruebas backend y el typecheck del frontend. Este último usa una pila de Node ampliada porque TypeScript 6 puede exceder la pila predeterminada en este proyecto. Ejecuta `npm run frontend:web` para abrir Expo en navegador. Las pruebas unitarias y de tipos no requieren base de datos. Para usar la API, configura PostgreSQL en `backend/.env`; si PostgreSQL no está disponible o el URI apunta a una base inexistente, la API devuelve un error `503` sanitizado. En desarrollo CORS admite localhost y direcciones LAN; antes de publicar, restringe `FRONTEND_ORIGINS` a los orígenes del despliegue.

El cliente Expo presenta una pantalla de login y añade el JWT a las llamadas API. La configuración de firma se toma de `JWT_SECRET`; en producción el servidor no inicia si falta. Las contraseñas nuevas usan scrypt con sal aleatoria; los hashes SHA-256 heredados se actualizan automáticamente al iniciar sesión correctamente. Antes de operaciones reales, habilita HTTPS, limita intentos de login y completa pruebas de permisos con una base de datos.
