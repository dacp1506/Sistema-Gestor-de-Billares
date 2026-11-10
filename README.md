# Bola8

Sistema de gestión multi-sucursal para salones de billar. El backend REST está organizado bajo `backend/` con arquitectura MVC; la aplicación multiplataforma se desarrolla en React Native / Expo bajo `frontend/`. La maqueta HTML de referencia está en `DATA TO BUILD/index.html` y no forma parte de la aplicación ejecutable.

## Requisitos

- Node.js 20 o posterior.
- PostgreSQL (Supabase o una instalación local).

## Configuración

1. Instala las dependencias: `npm --prefix backend install` y `npm --prefix frontend install`.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL`, `DATABASE_SSL=true` y un `JWT_SECRET` aleatorio. Puedes generarlo con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`; no lo compartas ni lo subas al repositorio. El backend usa HTTP `PORT=3000` por defecto. `HOST=0.0.0.0` hace que escuche en todas las interfaces, pero no es una URL que se pueda abrir en el navegador; en la misma computadora usa `http://localhost:3000`. Desde otro dispositivo, usa la IP LAN del PC (por ejemplo, `http://192.168.1.20:3000`). El puerto PostgreSQL `5432` es para la base de datos, no para el servidor HTTP. Para validar el certificado de Supabase, descarga su certificado raíz desde Database Settings → SSL Configuration, guárdalo como `backend/certs/supabase-root.crt` y configura `DATABASE_SSL_CA=certs/supabase-root.crt`.
3. Copia `frontend/.env.example` a `frontend/.env`. Para navegador local conserva `http://127.0.0.1:3000/api`; para un teléfono, usa la IP LAN del PC y el puerto HTTP del backend (por ejemplo `http://192.168.1.20:3000/api`). No pongas la contraseña de Supabase ni `JWT_SECRET` en variables `EXPO_PUBLIC_*`.
4. En una base nueva, ejecuta `backend/database/schema.sql` en Supabase o con `psql`. En una base existente creada con el esquema anterior, ejecuta primero y una sola vez `backend/database/migrations/add_usernames_to_branch_staff.sql`; asigna nombres iniciales `operador_<id>` al personal y conserva los correos previos. No vuelvas a ejecutar `schema.sql` antes de esa migración: las tablas existentes todavía no tienen la columna `username`.
5. No ejecutes `backend/database/seed.js` en Supabase ni en una base con datos reales: contiene identificadores fijos, cuentas de demostración y movimientos ficticios. Crea el catálogo desde la aplicación o inserta únicamente datos base revisados con SQL; las ventas, reservas, sesiones y turnos deben generarse por operaciones reales.
6. Crea el primer `admin_general` desde “Registrar administrador” en el login, o ejecuta `node database/create-admin.js` desde `backend/` en una terminal interactiva. El registro público se cierra al existir un administrador general; después, solo un administrador autenticado puede crear cuentas de sucursal. El comando CLI pide nombre, correo y contraseña oculta.
7. Desde la raíz del repositorio, inicia el backend API con `npm start`; con la configuración de ejemplo queda en `http://localhost:3000`.
8. En otra terminal, inicia Expo Web con `npm run frontend:web`; Expo muestra la dirección local en la consola. Para dispositivos móviles usa `npm run frontend:android` o `npm run frontend:ios`.

La primera versión se enfocará en operar online. Expo es el cliente en desarrollo para web, Android e iOS y consume la API autenticada con JWT. El backend aplica los permisos y el alcance de sucursal en cada solicitud. `DATA TO BUILD/index.html` es solo una referencia visual/instruccional: contiene una maqueta y no se sirve como aplicación. Todavía no hay instalador de escritorio ni modo de operación offline implementados; el offline se considera una ampliación opcional que requerirá arquitectura y validación propias.

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
DATA TO BUILD/
  index.html                 # Maqueta visual; no ejecutable
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

Expo es la aplicación cliente que se está ampliando para compartir interfaz y lógica entre navegador y móviles. La maqueta en `DATA TO BUILD/index.html` solo orienta el diseño y no se conecta a la API. El backend mantiene las rutas para inventario, mesas/sesiones, caja/POS, reservas, historial, dashboard, reportes, sucursales y usuarios, con permisos por rol.

`backend/database/seed.js` es un seed legado y no debe ejecutarse hasta corregirlo y validarlo: usa IDs fijos, cuentas de demostración y actividad ficticia; además, un detalle de venta no cumple la restricción de subtotal del esquema. Para datos reales, crea el catálogo desde la interfaz o usa SQL revisado.

## API disponible

- `POST /api/auth/login` — autentica al administrador general por email y al personal por nombre de usuario (también admite email para cuentas antiguas) y devuelve JWT.
- `POST /api/auth/register` — crea el primer administrador general y devuelve JWT; se cierra automáticamente cuando ya existe un administrador general.
- `GET /api/health` — estado del servidor y conexión a base de datos.
- `GET /api/dashboard?id_sucursal=:id` — resumen operativo, sesiones activas, ventas POS del día y caja abierta.
- `GET /api/reportes?periodo={diario,semanal,mensual,anual}&id_sucursal=:id` — agregados financieros por período (administradores).
- `GET|POST /api/sucursales` — listar y crear sucursales.
- `GET|PUT|DELETE /api/sucursales/:id` — consultar, actualizar y desactivar sucursales.
- `GET /api/mesas/sucursal/:id_sucursal` — listar mesas activas de una sucursal.
- `GET|POST /api/mesas` y `GET|PUT|DELETE /api/mesas/:id` — administrar mesas.
- `GET /api/productos?id_sucursal=:id` — listar el inventario de una sucursal.
- `GET|POST /api/productos` y `GET|PUT|DELETE /api/productos/:id` — administrar productos.
- `GET|POST /api/usuarios` y `GET|PUT|DELETE /api/usuarios/:id` — administrar usuarios (solo `admin_general`).

El administrador general se registra con correo y contraseña. Los administradores de sucursal y cajeros requieren nombre visible, nombre de usuario único, contraseña y sucursal; no necesitan correo. Para cuentas antiguas, la migración genera nombres temporales `operador_<id>` que el administrador general puede reemplazar desde la base hasta que la edición de usuarios esté disponible.
- `GET /api/caja`, `POST /api/caja/apertura` y `PATCH /api/caja/:id/cerrar` — consultar y controlar turnos de caja.
- `GET|POST /api/ventas` — historial y registro transaccional POS.
- `GET /api/sesiones` y `/api/sesiones/activas` — consultar sesiones.
- `POST /api/sesiones` y `PATCH /api/sesiones/:id/{pausar,reanudar,finalizar}` — controlar cronómetros.
- `GET|POST /api/reservas` — listar y crear reservas por sucursal o fecha.
- `GET /api/reservas/:id` y `PATCH /api/reservas/:id/estado` — consultar y actualizar estado de una reserva.

Todos los endpoints `/api` excepto `POST /api/auth/login` requieren `Authorization: Bearer <token>`. Las cuentas `admin_general` pueden consultar todas las sucursales y administrar usuarios y sucursales; `admin_sucursal` y `cajero` quedan limitados a la sucursal de su cuenta. La administración de productos y mesas requiere rol administrador. Las operaciones de venta y caja usan el usuario del token. Para abrir una sesión desde el dashboard global, `admin_general` selecciona un usuario activo de la sucursal; el backend comprueba que ese operador pertenezca a la sucursal. Los administradores y cajeros de sucursal siguen usando su identidad autenticada.

Para registrar ventas se requieren `id_sucursal`, `id_usuario`, `tipo_venta` (`directa` o `mesa`), `id_sesion` solo para venta de mesa e `items` con `id_producto` y `cantidad`. El precio se consulta en la base de datos y el stock se valida y descuenta dentro de la transacción.

Las reservas validan mesa activa, horario válido y conflicto de solapamiento dentro de la misma mesa para evitar duplicados en la misma franja.

El historial del frontend permite filtrar las últimas 100 ventas por fecha, tipo y sucursal; los administradores generales pueden consultar todas las sucursales. El detalle del recibo incluye los artículos y, en web, se puede imprimir o guardar como PDF desde el navegador.

El arqueo calculado suma la base inicial y las ventas de productos POS del operador durante el turno; no incluye cobros de alquiler de mesa porque esos cobros no se registran como transacciones. Los reportes agregan ventas de productos y el importe calculado al finalizar sesiones; son ingresos registrados, no utilidad neta ni conciliación de cobros. No incluyen costos, impuestos calculados, ni desglose por método de pago.

## Acceso inicial

No se publican credenciales de demostración. En una base nueva, crea el primer administrador mediante `node database/create-admin.js` desde `backend/`; el script solicita la contraseña de forma interactiva y la almacena como hash.

## Validación

```bash
npm run check
```

`npm run check` ejecuta las pruebas backend y el typecheck del frontend. Este último usa una pila de Node ampliada porque TypeScript 6 puede exceder la pila predeterminada en este proyecto. `npm start` inicia solo la API; `npm run frontend:web` inicia el cliente Expo para navegador. Las pruebas unitarias y de tipos no requieren base de datos. Para usar la API, configura PostgreSQL en `backend/.env`; si PostgreSQL no está disponible o el URI apunta a una base inexistente, la API devuelve un error `503` sanitizado. En desarrollo CORS admite localhost y direcciones LAN; antes de publicar, restringe `FRONTEND_ORIGINS` a los orígenes del despliegue.

El uso online está soportado por el cliente y la API cuando la base de datos es accesible. El modo offline aún no está implementado: antes de construirlo hay que definir qué operaciones se permiten desconectadas, dónde se almacenan localmente y cómo se sincronizan ventas, inventario, sesiones y cambios concurrentes entre sucursales.

El cliente Expo presenta una pantalla de login y añade el JWT a las llamadas API. La configuración de firma se toma de `JWT_SECRET`; en producción el servidor no inicia si falta. Las contraseñas nuevas usan scrypt con sal aleatoria; los hashes SHA-256 heredados se actualizan automáticamente al iniciar sesión correctamente. Antes de operaciones reales, habilita HTTPS, limita intentos de login y completa pruebas de permisos con una base de datos.
