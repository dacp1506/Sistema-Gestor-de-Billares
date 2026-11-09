# Documentación de desarrollo — Actividad 3

## Propósito y forma de trabajo

Este documento registra las decisiones que responda el estudiante, los pasos completados de la [Guía paso a paso de la Actividad 3](./DATA%20TO%20BUILD/Guia_Paso_a_Paso_Actividad_3.md), los cambios realizados al proyecto y su evidencia de verificación.

El trabajo se realizará en orden. Las decisiones que condicionan la arquitectura, la tecnología o el alcance se consultarán antes de implementarlas. No se registran contraseñas, cadenas de conexión, tokens ni otros secretos.

## Estado inicial del proyecto

- **Proyecto:** Sistema Web Multi-Sucursal de Gestión de Billares Bola8.
- **Documentos de referencia:** Actividades 1 y 2, y la guía de implementación de la Actividad 3.
- **Backend:** API REST en Express, con modelos PostgreSQL, rutas CRUD para sucursales, mesas y productos, ventas POS y control de sesiones de mesa.
- **Interfaz existente:** prototipo HTML/JavaScript en `views/index.html`, servido por Express. Sus datos siguen siendo de demostración en memoria y la interfaz todavía no consume la API.
- **Frontend independiente:** elegido React Native / Expo como cliente separado que consumirá la API REST.
- **Base de datos:** el backend ya incluye el esquema en `backend/database/schema.sql` y lee su configuración desde `backend/.env`.
- **Autenticación y permisos:** JWT/RBAC todavía no están implementados. La interfaz previa presenta roles de demostración; no son controles de seguridad.

## Registro de pasos, respuestas y cambios

| Guía | Estado | Respuesta / decisión | Cambios y evidencia |
|---|---|---|---|
| Paso 1 — Recuperar y revisar actividades anteriores | En curso | **Arquitectura:** React Native / Expo como cliente separado que consumirá la API REST Express existente. **Alcance:** “todos, por etapas”. **Primer módulo:** Productos e Inventario. | Decisiones confirmadas por el estudiante. La maqueta HTML actual queda como referencia visual. La conexión TLS/DB y sucursal están verificadas; el estudiante cargará el primer producto desde Expo. |
| Paso 3 — Crear o recuperar el frontend | Completado | **Respuesta del estudiante:** usar React Native / Expo. | Creado `frontend/` con la plantilla oficial `blank-typescript` (Expo SDK 58) y soporte web instalado (`react-dom`, `react-native-web`, `@expo/metro-runtime`). Se añadieron comandos web, Android, iOS y verificación de TypeScript. Evidencia: `npm run frontend:web` inició Metro en `http://localhost:8081` y la app se abrió en navegador. |
| Alcance general de la Actividad 3 | Confirmado | **Respuestas del estudiante:** primero indicó “todos” y eligió “todos, por etapas”; después seleccionó **Productos e Inventario** como el primer módulo. | Se comenzó el CRUD de productos y el inventario por sucursal; después se continuará con los módulos restantes, ampliando el backend cuando corresponda. No se marcarán como funcionales módulos sin API o persistencia. |
| Paso 2 — Preparar entorno | Completado | El backend usa HTTP `3000`; Expo web usa `8081`. El estudiante confirmó el puerto `5432` del pooler e inició el backend actualizado. | Se corrigió solo la ruta de base de datos en `backend/.env` a `/postgres`, sin mostrar ni cambiar la contraseña. `GET /api/health` en el proceso activo devuelve `database: connected`. |
| Configuración de Supabase | Conectada; sucursal inicial creada | **Respuestas del estudiante:** pidió guía, configuró el certificado, preguntó si `5432` es correcto y cómo reiniciar; autorizó detener el proceso antiguo, inició el actualizado y autorizó crear la primera sucursal con los datos proporcionados. | El backend activo conecta correctamente. La nueva sucursal quedó registrada (HTTP 201); no se copiaron dirección ni teléfono a este documento. |
| Pasos 4–6 — Estructura, estilos y pantalla | En curso | Se sigue el prototipo Bola8: tema oscuro, acento verde, idioma español, datos monetarios en Bs. y comportamiento adaptable. | Se creó estructura `frontend/src/{components,screens,services}` y pantalla Expo para inventario por sucursal. |
| Paso 8 — Conexión frontend/API | Implementado y conectado | URL centralizada en `EXPO_PUBLIC_API_URL`. CORS acotado a orígenes locales Expo. | Se corrigió el valor local predeterminado de `localhost` a `127.0.0.1` para coincidir con la dirección IPv4 donde escucha Express. La pantalla en navegador ya carga la sucursal desde la API. |
| Pasos 9–12 — CRUD del primer módulo | Alta y edición desde UI verificadas | Primer módulo: Productos e Inventario. | El estudiante eligió la interfaz para crear el producto; tras revisar una diferencia, autorizó corregirlo. Expo muestra Fanta, Bs 6, stock 10, mínimo 0, categoría Bebidas; API confirmó que todos los campos coinciden. |
| Paso 13 — Estados y mensajes | Implementado; recorrido básico verificado | El estudiante reportó que la pantalla no cargaba sucursales. | Se corrigió la URL local del cliente; se comprobó el estado vacío y el mensaje de éxito después del guardado. Falta capturar/verificar validación de datos inválidos. |
| Paso 14 — Responsive y accesibilidad | Parcial | Se conserva el diseño del prototipo y se comprueba en navegador. | Sin desbordamiento horizontal en viewport de 390 px. Pendiente completar comprobación de teclado/foco y lista de accesibilidad. |
| Paso 15 — Recorrido completo | Parcial; CREATE/UPDATE/READ verificados | El estudiante usará SQL después para añadir los demás productos y pidió avanzar al siguiente paso. | Alta y edición desde Expo verificadas en la API. La desactivación de un producto de negocio y el rechazo de un dato inválido no se probaron; no se modificará ni desactivará inventario sin permiso. |
| Módulo siguiente — Mesas y sesiones | Implementado y verificado | **Respuesta del estudiante:** “Mesas y sesiones”. | Se añadió la navegación por tabs en `frontend/App.tsx` y la pantalla `TablesScreen` para seleccionar sucursales, crear mesas, iniciar sesiones, pausarlas, reanudarlas y finalizarlas. También se añadieron servicios y validación para `/api/mesas` y `/api/sesiones`, con pruebas de backend para `validateStartSession`. Evidencia de verificación: `npm --prefix backend run check` -> 9 pruebas OK; `npm --prefix frontend run typecheck` -> OK. |
| Módulo siguiente — Caja y ventas POS | Implementado y verificado | **Respuesta del estudiante:** “continuamos”. | Se añadió la pantalla `SalesScreen` para crear ventas directas y de mesa, validar stock, registrar productos con cantidad y consultar el historial reciente por sucursal. La app incluye la pestaña de caja junto a productos y mesas. Evidencia: `npm --prefix frontend run typecheck` y `npm --prefix backend run check` están OK. |
| Módulo siguiente — Usuarios y operadores | Implementado y verificado | **Respuesta del estudiante:** “sigamos”. | Se añadió la gestión de usuarios en backend (`/api/usuarios`) y la pantalla `UsersScreen` en Expo para crear operadores con rol y sucursal, activar/desactivar y eliminar usuarios lógicos. La validación incluye correo, contraseña, rol y asignación de sucursal. Evidencia: `npm --prefix frontend run typecheck` y `npm --prefix backend run check` siguen OK. |
| Módulo siguiente — Turnos de caja | Implementado y verificado | **Respuesta del estudiante:** “continuamos con la caja”. | Se completa la lógica de flujo de caja con apertura/cierre de turno, validación de `monto_inicial` y `monto_declarado`, y la pantalla en la pestaña de caja para abrir y cerrar turno por sucursal. La API rest expone `/api/caja` con filtros por sucursal y usuario, mientras la validación backend cubre los casos positivos y negativos. Evidencia: `npm --prefix backend run check` -> 11 pruebas OK; `npm --prefix frontend run typecheck` -> OK. |
| Siguiente fase — autenticación JWT | Implementado y validado | **Respuesta del estudiante:** “continua” y se pidió cerrar la capa de seguridad básica. | Se añadió `POST /api/auth/login` con validación de email/password, generación de JWT y middleware `requireAuth`/`requireRole`. La base de usuarios queda con `findByEmail`, el seed usa hashes reales y vuelta a usar `hashPassword` compartido. Evidencia: pruebas backend actualizadas y aprobadas con `node --test`: 13 pruebas OK. |

## Decisión registrada — arquitectura de frontend

La guía indica no mezclar un frontend independiente que consume JSON con vistas renderizadas por MVC. Actualmente `views/index.html` es HTML estático servido por Express, mientras que las operaciones de datos se exponen como API REST. El estudiante confirmó:

- **React Native / Expo multiplataforma**, conforme a la propuesta de la Actividad 1. El frontend se ubicará en un proyecto separado y consumirá la API REST Express ya existente. La maqueta de `views/` se conserva como referencia visual; no se crea una segunda interfaz HTML de producción.

## Paso 1 — módulo Productos e Inventario

### Contrato del backend revisado

El backend expone los siguientes endpoints reales para este módulo:

| Operación | Método y ruta | Datos / respuesta |
|---|---|---|
| Listar inventario de una sucursal | `GET /api/productos?id_sucursal=:id` | Responde `{ data: [...] }`; cada producto incluye `id_producto`, `nombre`, `precio_venta`, `stock`, `stock_minimo`, `id_sucursal` y `categoria`. `id_sucursal` es obligatorio. |
| Consultar producto | `GET /api/productos/:id` | Responde `{ data: producto }`. |
| Registrar producto | `POST /api/productos` | Requiere `nombre`, `precio_venta`, `stock`, `id_sucursal`; acepta `stock_minimo` y `categoria`. Responde HTTP `201` con `{ data: producto }`. |
| Editar producto | `PUT /api/productos/:id` | Acepta los campos validados de producto y responde `{ data: producto }`. |
| Desactivar producto | `DELETE /api/productos/:id` | Baja lógica (`activo = FALSE`); responde `{ data: producto, message: ... }`. |
| Listar sucursales para seleccionar inventario | `GET /api/sucursales` | Responde `{ data: [...] }`; solo sucursales activas por defecto. |

Reglas confirmadas en las validaciones del backend: `nombre` obligatorio (hasta 120 caracteres), `precio_venta` número mayor o igual a cero, `stock` y `stock_minimo` enteros no negativos, `categoria` opcional (hasta 80 caracteres) e `id_sucursal` entero positivo. Las categorías se crean o reutilizan desde el backend al guardar un producto; no existe todavía un endpoint de catálogo de categorías.

**Verificación pendiente:** descargar el certificado raíz en Supabase → Database Settings → SSL Configuration, guardarlo como `backend/certs/supabase-root.crt`, definir `DATABASE_SSL_CA=certs/supabase-root.crt` en `backend/.env`, reiniciar el backend y probar `GET /api/health`, `GET /api/sucursales` y el listado filtrado por sucursal. No desactivar la validación TLS ni compartir el archivo `.env`.

## Registro de cambios de Actividad 3

| Cambio | Archivos | Evidencia |
|---|---|---|
| Corregido el puerto HTTP del backend a `3000`, conservando la configuración de base de datos. | `backend/.env` (local, excluido del repositorio) | Se verificó el valor de `PORT` sin registrar credenciales en este documento. |
| Creado el proyecto independiente Expo/TypeScript para targets web y nativos. | `frontend/` | Plantilla `blank-typescript`; dependencias instaladas por npm. |
| Agregado soporte web al proyecto Expo y comandos de ejecución/verificación. | `frontend/package.json`, `package-lock.json`, `package.json` raíz, `README.md` | Se instalaron los módulos web compatibles con Expo SDK 58. |
| Se verificó el backend y el chequeo de tipos del cliente Expo. | `npm run check` | Ocho pruebas del backend aprobadas y `tsc --noEmit` completado sin errores. |
| Se confirmó que Expo web sirve la pantalla de Productos e Inventario en navegador. | `npm run frontend:web` | Metro inició en `http://localhost:8081`; se comprobó que la pantalla no tiene desbordamiento horizontal en un viewport de 390 px. |
| Instalación inicial reportó cinco vulnerabilidades moderadas, sin hallazgos de nivel alto o crítico. | Dependencias del proyecto `frontend/` | `npm audit` indica que la corrección sugerida por npm supondría cambiar Expo a una versión mayor anterior; no se aplicó `npm audit fix --force` para evitar una degradación incompatible. |
| Implementado el primer módulo Expo de inventario, incluyendo listados responsivos, búsqueda, formulario validado, edición y confirmación de baja lógica. | `frontend/src/screens/ProductsScreen.tsx`, `frontend/src/components/`, `frontend/src/services/`, `frontend/App.tsx` | Consume sucursales/productos reales; refleja carga, vacío y errores de API sin datos de sustitución. |
| Corregida la URL local del cliente para coincidir con el backend IPv4; se comprobó la pantalla con datos de la API. | `frontend/src/services/api.ts`, `frontend/.env.example`, `README.md` | URL predeterminada `http://127.0.0.1:3000/api`; después de iniciar el backend, Expo mostró la sucursal inicial y el inventario vacío. `npm run check`: ocho pruebas backend y chequeo de tipos aprobados. |
| Configurado CORS local para Expo y una respuesta sanitizada ante indisponibilidad de PostgreSQL. | `backend/src/app.js`, `backend/src/middlewares/error-handler.js`, `backend/.env.example` | Origen `http://localhost:8081` recibió `Access-Control-Allow-Origin`; un origen no autorizado no recibió ese encabezado. La prueba de salud devolvió `503 DATABASE_UNAVAILABLE`. |
| Verificada la conexión tras actualizar el URI; se detectó una cadena TLS no confiable. Se añadió soporte para el certificado raíz de Supabase sin desactivar la verificación. | `backend/src/config/db.js`, `backend/src/middlewares/error-handler.js`, `backend/.env.example`, `backend/.gitignore`, `backend/tests/error-handler.test.js`, `README.md` | TLS validado correctamente mediante certificado raíz. Se corrigió de forma local la ruta de base a `/postgres`; un proceso nuevo respondió HTTP 200 con base conectada. |
| Pruebas de API contra la base configurada. | `GET /api/health`, `GET /api/sucursales`, `GET /api/productos?id_sucursal=:id` | Proceso activo: health HTTP 200 y sucursales HTTP 200 con una sucursal. Inventario de la sucursal inicial respondió HTTP 200 con cero productos. |
| Registrada la primera sucursal a petición del estudiante y verificado su inventario vacío. | `POST /api/sucursales`, `GET /api/sucursales`, `GET /api/productos?id_sucursal=1` | Creación HTTP 201; listado HTTP 200 con una sucursal; inventario HTTP 200 con cero productos. Nombre/dirección/teléfono no se replican en documentación. |
| El estudiante guardó el primer producto desde Expo; a petición suya se corrigió en esa misma interfaz y se verificó por API. | Pantalla Expo, `GET /api/productos?id_sucursal=1` | Producto final: Fanta, Bs 6, stock 10, mínimo 0, categoría Bebidas. Respuesta API HTTP 200; un producto encontrado y todos los campos coinciden. |
| Corregida una validación incorrecta en la ruta de listado de mesas por sucursal. | `backend/src/routes/mesaRoutes.js` | La ruta `/api/mesas/sucursal/:id_sucursal` ya no aplica `validateId`, que esperaba `params.id`; ahora el controlador valida `id_sucursal`. Una sucursal válida responde HTTP 200; un ID inválido responde HTTP 400 `BRANCH_REQUIRED`. `npm run check`: ocho pruebas backend y chequeo de tipos aprobados. |

| Módulo siguiente — Reservas de mesa | Implementado y verificado | **Respuesta del estudiante:** “continua”. | Se incorpora la API `GET|POST /api/reservas` y la vista `ReservationsScreen`, con validación de horario, conflicto de solapamiento por mesa y mantenimiento del estado de la reserva desde la interfaz. La navegación principal del cliente incluye la nueva pestaña y la validación backend cubre datos y estados. Evidencia: `npm --prefix backend run check` -> 12 pruebas OK; `npm --prefix frontend run typecheck` -> OK. |

### Próximo paso — elegir la siguiente etapa del proyecto

**Respuestas registradas:** el estudiante autorizó crear la sucursal inicial y proporcionó sus datos; se guardó sin duplicar dirección/teléfono en este documento. Ante el problema de carga de sucursales, se cambió la URL local del cliente a `127.0.0.1`. Fanta quedó corregida desde Expo y verificada por API: Bs 6, stock 10, mínimo 0, categoría Bebidas. El estudiante indicó que añadirá los otros productos directamente por SQL más adelante y pidió continuar con el siguiente paso. No se añadirán más productos ahora.

La interfaz del primer módulo está conectada y lista para usar. **Siguiente módulo elegido por el estudiante: Mesas y sesiones.** La API lista mesas y sesiones, pero la sucursal actualmente tiene cero mesas y cero usuarios activos. Iniciar una sesión requiere `id_usuario` de un usuario activo de esa sucursal, y no existe endpoint frontend para listar usuarios. Antes de habilitar el inicio de sesiones, se debe elegir entre cargar operadores por SQL, implementar autenticación/gestión de usuarios, o dejar el control de sesión pendiente. Los demás productos se añadirán posteriormente por SQL, según indicó el estudiante.

**Pausa solicitada por el estudiante:** detener el trabajo aquí y continuar mañana. No se eligió todavía cómo resolver el operador activo; reanudar preguntando esa decisión y luego implementar Mesas y sesiones.

No enviar ni publicar el URI, contraseña, certificado privado o capturas con credenciales, ni el contenido de `.env`. Referencia oficial: [Conectar a PostgreSQL desde Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Actualización 2026-11-09 — Inicio de sesión y autorización

Se completó el inicio de sesión en Expo y se pasó a exigir JWT en todos los endpoints `/api` excepto `POST /api/auth/login`. El cliente adjunta el token como bearer y permite cerrar sesión. El backend aplica autorización por rol en administración de sucursales/usuarios y gestión de productos/mesas; usuarios de sucursal quedan limitados a su sucursal en lecturas y cambios, y las operaciones de caja/ventas/sesiones usan el ID de usuario autenticado. También se restringe el cierre de turnos para que un cajero cierre únicamente los suyos.

La firma JWT se configura con `JWT_SECRET`; el ejemplo de entorno incluye la variable y producción rechaza el arranque si no está definida. Para una base que aún no tiene un administrador general se agregó `backend/database/create-admin.js`, que crea uno interactivamente con contraseña oculta. La comprobación de la base conectada encontró cero usuarios, por lo que este bootstrap debe ejecutarse antes del primer inicio de sesión; no se modificaron los datos de negocio ni se ejecutó el seed.

Verificación de esta actualización: `npm --prefix backend run check` aprobó 16 pruebas; `npm --prefix frontend run typecheck` aprobó. Prueba HTTP local: health `200`, acceso sin token `401`, acceso con JWT `200`, sucursal ajena `403`, acceso de cajero a usuarios `403`, login incorrecto `401`, y preflight de Expo desde LAN `204`.
