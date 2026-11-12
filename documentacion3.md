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
| Paso 14 — Responsive y accesibilidad | Parcial; barrido web completado en pantallas principales | Pendiente validar en un dispositivo nativo. | Login probado a 390/1440 px; drawer autenticado a 390 px sin overflow. Diálogos de producto, mesa, sucursal y usuario confinan Tab/Shift+Tab, cierran con Escape y restauran el foco. Reservas y Caja recorren sus campos; los grupos Tipo de venta y Rol anuncian radio/checked y funcionan con flechas y Space. El bundle web compila; el typecheck estándar presenta un stack overflow de TypeScript 6 y el check con pila ampliada pasa. |
| Paso 15 — Recorrido completo | CRUD de producto y validación negativa comprobados desde UI | El estudiante autorizó crear y desactivar un producto temporal de prueba. | Desde Inventario se creó y editó `QA-CRUD-20261109182153`, y se desactivó con la confirmación de la interfaz. Base verificada: `id_producto=14`, nombre `QA-CRUD-20261109182153-EDIT`, precio Bs. 1.50, stock 2, `activo=false`, sucursal 1. El registro queda como baja lógica para conservar trazabilidad; no se tocó Fanta ni otra existencia. Una mesa sin número también fue rechazada y cancelada sin escritura. |
| Paso 16 — README y respaldo | README actualizado localmente; sin commit/push | Se documentaron comandos y configuración real del proyecto. | README separa backend HTTP `3000` de PostgreSQL `5432`, explica configuración Expo y login JWT, lista módulos/rutas actuales y advierte que el seed demo no se debe ejecutar hasta corregir sus datos. `npm run check`: 18 pruebas backend aprobadas y typecheck frontend sin errores. No se creó commit ni se subió a GitHub. |
| Paso 17 — Informe PDF y evidencias | Pendiente | Faltan datos de portada del estudiante. | Requiere nombre del estudiante, materia/sección y docente, además de capturas finales del recorrido. No se inventarán datos personales ni se generará una portada con información supuesta. |
| Módulo siguiente — Mesas y sesiones | Implementado y verificado | **Respuesta del estudiante:** “Mesas y sesiones”. | Se añadió la navegación por tabs en `frontend/App.tsx` y la pantalla `TablesScreen` para seleccionar sucursales, crear mesas, iniciar sesiones, pausarlas, reanudarlas y finalizarlas. También se añadieron servicios y validación para `/api/mesas` y `/api/sesiones`, con pruebas de backend para `validateStartSession`. Evidencia de verificación: `npm --prefix backend run check` -> 9 pruebas OK; `npm --prefix frontend run typecheck` -> OK. |
| Módulo siguiente — Caja y ventas POS | Implementado y verificado | **Respuesta del estudiante:** “continuamos”. | Se añadió la pantalla `SalesScreen` para crear ventas directas y de mesa, validar stock, registrar productos con cantidad y consultar el historial reciente por sucursal. La app incluye la pestaña de caja junto a productos y mesas. Evidencia: `npm --prefix frontend run typecheck` y `npm --prefix backend run check` están OK. |
| Módulo siguiente — Usuarios y operadores | Implementado y verificado | **Respuesta del estudiante:** “sigamos”. | Se añadió la gestión de usuarios en backend (`/api/usuarios`) y la pantalla `UsersScreen` en Expo para crear operadores con rol y sucursal, activar/desactivar y eliminar usuarios lógicos. La validación incluye correo, contraseña, rol y asignación de sucursal. Evidencia: `npm --prefix frontend run typecheck` y `npm --prefix backend run check` siguen OK. |
| Módulo siguiente — Turnos de caja | Implementado y verificado | **Respuesta del estudiante:** “continuamos con la caja”. | Se completa la lógica de flujo de caja con apertura/cierre de turno, validación de `monto_inicial` y `monto_declarado`, y la pantalla en la pestaña de caja para abrir y cerrar turno por sucursal. La API rest expone `/api/caja` con filtros por sucursal y usuario, mientras la validación backend cubre los casos positivos y negativos. Evidencia: `npm --prefix backend run check` -> 11 pruebas OK; `npm --prefix frontend run typecheck` -> OK. |
| Siguiente fase — autenticación JWT | Implementado y validado | **Respuesta del estudiante:** “continua” y se pidió cerrar la capa de seguridad básica. | Se añadió `POST /api/auth/login` con validación de email/password, generación de JWT y middleware `requireAuth`/`requireRole`. La base de usuarios queda con `findByEmail`, el seed usa hashes reales y vuelta a usar `hashPassword` compartido. Evidencia: pruebas backend actualizadas y aprobadas con `node --test`: 13 pruebas OK. |
| Módulos de administración — Inventario local, Sucursales cadena y Usuarios y roles | Implementado y verificado contra la base real | **Respuesta del estudiante:** “desarrolla completamente los módulos de inventario local, sucursal cadena y usuario y roles; tiene que estar igual que `DATA TO BUILD/index.html` (solo maqueta, sin funcionalidad)”. | Las tres pantallas de Expo se reescribieron con la maqueta como referencia visual y contra la API real, sin datos de sustitución: inventario con tabla responsive y reabastecer **+10 Unid.**; tarjetas de sucursal con Mesas Activas, Ingresos Hoy y “Administrar esta Sucursal”; usuarios con KPIs, filtros, tabla y alta/edición/baja. El backend añadió las métricas por sucursal en `GET /api/sucursales` y el parámetro `?inactivas=true` en `GET /api/usuarios`; el dashboard acepta la prop `initialBranchId`. Evidencia: `npm run check` -> 30 pruebas backend OK y typecheck frontend OK; consulta de solo lectura a la base real devolvió `mesas_total=4`, `mesas_ocupadas=0`, `ingresos_hoy=24.00` y 4 cuentas reales. |
| Módulo de Configuración App | Implementado y verificado contra la base real | **Respuesta del estudiante:** “desarrolla la parte de configuración; tiene que estar igual que la maqueta”. | Se creó el módulo de Configuración App con el panel de la maqueta (tema, idioma, moneda, facturación y ticket) y persistencia real: tabla `configuraciones_usuario`, endpoints `GET|PUT /api/configuraciones` y validación `validateSettings`. El nombre comercial y el formato de impresión se aplican al comprobante del historial. Evidencia: `npm run check` -> 31 pruebas backend OK y typecheck frontend OK; `GET` devolvió los valores por defecto, `PUT` guardó, el `GET` posterior devolvió lo guardado, un `PUT` inválido respondió 400 y sin token 401. |

## Decisión registrada — arquitectura de frontend

La guía indica no mezclar un frontend independiente que consume JSON con vistas renderizadas por MVC. Actualmente `views/index.html` es HTML estático servido por Express, mientras que las operaciones de datos se exponen como API REST. El estudiante confirmó:

- **React Native / Expo multiplataforma**, conforme a la propuesta de la Actividad 1. El frontend se ubicará en un proyecto separado y consumirá la API REST Express ya existente. La maqueta de `views/` se conserva como referencia visual; no se crea una segunda interfaz HTML de producción.
- La navegación, el encabezado y la identidad visual de `views/index.html` sirven de referencia para las pantallas Expo. Sus datos en memoria y su selector de roles simulado no se incorporan al cliente autenticado.

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
| Reimplementados los módulos de inventario, sucursales cadena y usuarios y roles siguiendo la maqueta, con las métricas por sucursal calculadas en el backend y el filtro de usuarios inactivos habilitado. | `frontend/src/screens/ProductsScreen.tsx`, `frontend/src/screens/BranchesScreen.tsx`, `frontend/src/screens/UsersScreen.tsx`, `frontend/App.tsx`, `frontend/src/services/branches.ts`, `frontend/src/services/users.ts`, `backend/src/models/sucursalModel.js` | `npm run check`: 30 pruebas backend aprobadas y typecheck sin errores. Consulta de solo lectura a la base real: `GET /api/sucursales` devolvió `mesas_total=4`, `mesas_ocupadas=0` e `ingresos_hoy=24.00`; `GET /api/usuarios?inactivas=true` devolvió 4 cuentas reales. |
| Añadido el módulo de Configuración App, con preferencias persistidas por cuenta y su aplicación en el comprobante del historial. | `backend/src/models/configuracionModel.js`, `backend/src/controllers/configuracionController.js`, `backend/src/routes/configuracionRoutes.js`, `backend/database/migrations/add_user_settings.sql`, `frontend/src/services/settings.ts`, `frontend/src/screens/SettingsScreen.tsx`, `frontend/App.tsx`, `frontend/src/screens/HistoryScreen.tsx` | `npm run check`: 31 pruebas backend y typecheck sin errores; export web con 2306 módulos. Prueba HTTP: `GET` devolvió los valores por defecto, `PUT` guardó y respondió 200, `PUT` inválido respondió 400 y sin token 401. |

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

### Mejora de contraseñas

Las contraseñas se almacenan ahora con scrypt (sal aleatoria por contraseña y parámetros de coste configurados en el código). Los hashes SHA-256 existentes se verifican en tiempo constante y se reemplazan por scrypt tras un login válido; los nuevos usuarios y cambios de contraseña usan scrypt directamente. El alta de cuentas requiere al menos 12 caracteres en la interfaz y backend. El login mantiene aceptación de longitud heredada para permitir migrar cuentas previas.

## Continuación 2026-11-09 — Navegación alineada con la referencia

Se retomó el Paso 14 de la guía. La app Expo mantiene el flujo real de autenticación y las pantallas ya conectadas a la API, pero su shell ahora sigue la organización visual de `views/index.html`: marca Bola8, perfil autenticado, secciones de navegación, estado activo y encabezado operativo. En escritorio utiliza una barra lateral; en anchos menores a 960 px abre un drawer con controles etiquetados para abrir y cerrar. Solo se muestran destinos que ya tienen una pantalla funcional, y Usuarios continúa limitado a `admin_general`.

Se agregó `lucide-react-native` con `react-native-svg` para usar iconos compatibles con Expo. Verificación final: `npx expo export --platform web` compiló 2311 módulos y `GET /api/health` respondió HTTP 200 (`database: connected`). Login sin overflow a 390/1440 px; Tab recorre correo/contraseña. En la sesión admin se comprobaron Mesas, Reservas, Caja, Inventario real (Fanta, Bs. 6, stock 10) y Usuarios. El CRUD de producto desde UI quedó verificado con el producto temporal ID 14 y estado inactivo. Una mesa inválida se rechazó y canceló sin escribir. Producto, mesa, selector de sucursal y alta de usuario confinan Tab/Shift+Tab y Escape, y devuelven el foco. Reservas y Caja recorren sus campos con Tab. Tipo de venta y Rol exponen grupos radio con `aria-checked`; flechas cambian selección/foco y Space activa la opción. El drawer móvil cicla Tab/Shift+Tab, cierra con Escape, devuelve el foco y no tiene overflow (`scrollWidth=390`). El typecheck estándar de TypeScript 6 termina con `RangeError: Maximum call stack size exceeded`; `node --stack-size=8192 ./node_modules/typescript/bin/tsc --noEmit` termina sin errores. No se validó Android/iOS nativo.

**Pendiente del Paso 14:** validar accesibilidad/teclado en un dispositivo Android o iOS. **Paso 15:** recorrido CREATE/UPDATE/READ/DELETE lógico completado en el módulo de Productos y validación negativa en Mesas; el producto de prueba ID 14 queda inactivo.

## Continuación 2026-11-09 — Historial y recibos

Se agregó la sección “Historial y recibos” a la navegación lateral para acercar la app Expo a la referencia de `views/index.html`. La pantalla consume la API real de ventas y ofrece filtros por hoy/ayer/todas las fechas, tipo de venta y sucursal; el filtro global está disponible únicamente a `admin_general`. Presenta KPIs calculados sobre las operaciones filtradas, detalle del recibo y formato de impresión para navegador.

`GET /api/ventas` ahora incluye el nombre de sucursal/operador y sus líneas de detalle mediante una agregación parametrizada en PostgreSQL. El historial muestra hasta las 100 operaciones recientes que admite el endpoint, sin simular ni paginar datos inexistentes.

Verificación: backend `npm run check` con 18 pruebas aprobadas; frontend `npm run typecheck` aprobado. El export web y recorrido visual de la sección quedan pendientes de comprobar con el servidor Expo y una cuenta autenticada.

## Continuación — Administración de sucursales

Se integró “Sucursales cadena” a la navegación de Expo y se restringió junto con Usuarios al rol `admin_general`. La pantalla consume `/api/sucursales` y permite consultar sucursales activas, registrar y editar nombre/dirección/teléfono, y desactivar con confirmación; no elimina registros históricos. Los errores de API y validación se muestran en la interfaz.

Verificación: `frontend` `npm run typecheck` aprobado; `npx expo export --platform web` completado (2276 módulos); backend `npm run check` con 18 pruebas aprobadas; `git diff --check` limpio. No se realizó un recorrido autenticado de alta/edición/desactivación en navegador en esta continuación.

## Registro de decisión anterior — Cliente web en `views/index.html` (reemplazado)

**Nueva decisión del estudiante:** el cliente web principal debe quedar implementado en `views/index.html`. Esta decisión actualiza la anterior que mantenía ese archivo solo como maqueta; el proyecto Expo se conserva como cliente multiplataforma alternativo.

El HTML ahora usa el backend Express en el mismo origen, autentica mediante `POST /api/auth/login` y conserva el JWT solo en memoria de la pestaña. Consume la API para inventario (alta, edición y baja lógica), mesas (alta, edición, baja lógica) y sesiones, turnos de caja, ventas directas o de mesa, reservas (alta y cambio de estado), historial/recibos imprimibles, sucursales y usuarios. La sucursal y el usuario de cada operación se envían conforme al contrato actual; el backend sigue siendo quien aplica los permisos y valida los datos. El menú oculta la administración de sucursales/usuarios para roles distintos de `admin_general`; las opciones de modificación del inventario y mesas también respetan los roles disponibles.

Se actualizó el README para indicar que Express sirve el cliente principal en `http://localhost:3000`; Expo permanece como alternativa. Verificación: `npm --prefix backend run check` pasó 18/18 pruebas; el JavaScript inline de `views/index.html` pasó el parser de Node; `git diff --check` pasó. En navegador con respuestas de API simuladas se comprobó login, navegación por todos los módulos, el payload de alta de producto, y que un cajero no ve administración ni acciones de escritura de inventario. A 390 px no hay desbordamiento horizontal; el menú móvil cierra con botón y Escape; a 1440 px tampoco hay desbordamiento. No se pudo hacer una prueba autenticada contra la base real porque el backend no estaba activo en `127.0.0.1:3000`.

### Módulos operativos añadidos a la web

Se añadieron vistas de dashboard (refresco automático cada 30 segundos), POS/control de mesas, arqueo de caja, reportes por período y sucursal, administración de tarifas, sucursal asignada/cadena, configuración local y recibos imprimibles o guardables como PDF. Se incorporaron `GET /api/dashboard` y `GET /api/reportes`; los reportes agregan en PostgreSQL ventas de productos y sesiones finalizadas, sin usar el historial limitado para calcular los totales. Se añadió una prueba del modelo de reportes y se corrigió el filtro de fechas futuras en agregados por sucursal. El dashboard reutiliza la consulta agregada de ventas recientes.

El arqueo aún no puede incluir cobros de alquiler de mesa porque esos cobros no se registran en la base. Los reportes son ingresos registrados y no utilidad neta ni conciliación de pagos; moneda, apariencia y opciones del recibo son preferencias locales. El diseño web usa la misma paleta y navegación general de la maqueta, pero todavía no se ha verificado ni restituido una equivalencia visual pixel por pixel con la versión original de `views/index.html`.

Verificación de esta continuación: `npm --prefix backend run check` pasó 20/20 pruebas, parser de Node para el JavaScript inline aprobado y `git diff --check` limpio. No se verificaron los endpoints contra una base real.

## Decisión actualizada — Expo como aplicación; HTML como maqueta

El estudiante aclaró que `index.html` es una maqueta de referencia, no una pantalla funcional del producto. Se movió la versión original de la maqueta a `DATA TO BUILD/index.html`, se eliminó la implementación funcional que había reemplazado `views/index.html` y Express dejó de servir un cliente en `/` o `/index.html`. El backend es una API y Expo (`frontend/`) es el cliente multiplataforma en desarrollo.

El estudiante espera que el producto pueda operar conectado a internet y que exista la opción de ofrecerlo offline. La funcionalidad offline, la sincronización entre sucursales y los instaladores de escritorio todavía no están implementados. Se requiere definir qué datos y operaciones se autorizan offline, cómo se sincronizan y cómo se resuelven conflictos antes de elegir una estrategia de almacenamiento local.

**Decisión posterior del estudiante:** iniciar online-first; considerar el funcionamiento offline como una ampliación opcional según la necesidad del comprador. Por ello, la primera entrega no debe anunciar ni prometer trabajo offline.

### Dashboard operativo en Expo

Se separó el dashboard de la pantalla de control de mesas; el destino “Dashboard mesas” ya no abre por error el CRUD/control de mesas. La pantalla nueva consume `GET /api/dashboard?id_sucursal=:id`, muestra ocupación, ventas de productos registradas, turnos abiertos, sesiones activas y ventas recientes, con selección de sucursal para `admin_general` y actualización automática cada 30 segundos. Se agregó el tipo/servicio cliente de dashboard. Los alquileres de sesiones activas se etiquetan como estimados; no son cobros registrados.

La aplicación Expo continúa como cliente online multiplataforma. El modo offline y la instalación de escritorio todavía no se implementan. Se excluyó `frontend/dist` generado por Expo del typecheck: su bundle JavaScript podía provocar `RangeError` del compilador TypeScript 6 y no es código fuente que deba typecheckearse.

### Reportes financieros en Expo

Se añadió una pantalla de reportes para `admin_general` y `admin_sucursal`, conectada a `GET /api/reportes`. Permite filtrar períodos diario, semanal, mensual y anual; `admin_general` puede consultar la cadena completa o seleccionar una sucursal. Presenta ingresos registrados, ventas POS, alquiler de sesiones finalizadas, gráfico temporal y agregados por sucursal. La vista advierte que estas cifras no representan utilidad neta ni conciliación de caja. La API y las pruebas de agregación existían antes de esta pantalla.

Verificación: `npm run check` aprobó 20 pruebas backend y el typecheck de Expo; `npx expo export --platform web` completó el bundle web con 2303 módulos. No se validó el reporte con datos de una base real ni en dispositivos Android/iOS.

### Dashboard de mesas interactivo

Se amplió el dashboard Expo para cargar también la lista real de mesas y presentar su estado individual. Desde cada mesa disponible se puede iniciar una sesión; `admin_sucursal` y `cajero` operan con su identidad autenticada, mientras que `admin_general` debe seleccionar un usuario activo de esa sucursal. Se añadió la validación del operador al modelo de sesión existente para comprobar sucursal y estado activo. El dashboard también permite pausar, reanudar y finalizar con confirmación las sesiones, y poner/liberar mesas de mantenimiento para roles administradores. Los cronómetros avanzan localmente entre refrescos de datos; dashboard y lista de mesas se actualizan desde la API cada 30 segundos. Los importes de alquiler en sesiones abiertas se presentan como estimados. Para el rol cajero, el dashboard limita sesiones, ventas y caja a los datos del usuario autenticado.

Verificación: pruebas backend de identidad de inicio de sesión para `admin_general` y roles de sucursal y de alcance de datos de cajero; `npm run check` con 23 pruebas aprobadas; export web Expo compilado (2319 módulos). No se enviaron operaciones de negocio a la base conectada. Falta prueba visual autenticada de los controles con datos de prueba y no se validó Android/iOS nativo.

### Acceso de personal por nombre de usuario

El administrador general conserva el acceso por correo. Las cuentas nuevas de `admin_sucursal` y `cajero` se crean con nombre de usuario único, contraseña y sucursal; el formulario ya no pide correo para esos roles y permite elegir una sucursal existente. El login acepta usuario o correo para mantener compatibilidad con cuentas anteriores. La selección de operador del dashboard vuelve a cargar operadores activos de la sucursal cuando el servidor detecta una asignación vencida o incorrecta, sin relajar la validación del backend.

Para instalaciones nuevas, el esquema ya incluye `username` y permite email nulo para cuentas de sucursal. En bases existentes, ejecutar una vez `backend/database/migrations/add_usernames_to_branch_staff.sql`; conserva los correos anteriores y asigna temporalmente `operador_<id>` a quienes aún no tengan username. Reemplazar esos nombres desde SQL si se desea entregar credenciales personalizadas; la edición del username desde la interfaz aún no está disponible.

Verificación de esta actualización: pruebas backend, typecheck del cliente y export web; no se ejecutó la migración ni se modificaron usuarios en una base conectada.

### Registro inicial desde el login

Se agregó la opción “Registrar administrador” en la pantalla de login y `POST /api/auth/register`. Este registro crea únicamente el primer `admin_general`; se serializa en PostgreSQL y se cierra cuando ya hay una cuenta de ese rol. Así se evita que cualquier visitante pueda registrarse como administrador una vez configurado el sistema. El correo se valida por formato, pero no se verifica por email. Las demás cuentas se crean desde “Usuarios y roles”.

El mensaje `email debe ser un correo válido` ya no aparece cuando el formulario de una cuenta de sucursal envía el campo `email` vacío; si se envía un correo con contenido para un usuario de sucursal, se sigue rechazando.

## Continuación 2026-11-12 — Inventario local, sucursales cadena y usuarios y roles

El estudiante pidió completar los tres módulos de administración con la apariencia de la maqueta `DATA TO BUILD/index.html`, aclarando que ese HTML es solo referencia visual y no tiene funcionalidad. Se reescribieron las tres pantallas de Expo contra la API real, sin datos de sustitución ni valores inventados, y se amplió el backend solo donde faltaba información real.

### Inventario local (`frontend/src/screens/ProductsScreen.tsx`)

La pantalla replica la maqueta: tabla en escritorio (Producto, Categoría, Precio de venta, Stock actual, Estado del stock, Reabastecer) y tarjetas equivalentes en móvil, con buscador, selector de sucursal y un resumen con productos activos, productos con stock bajo y sucursal seleccionada. Se conservan las operaciones reales: alta y edición con `POST /api/productos` y `PUT /api/productos/:id`, baja lógica con confirmación y la acción rápida **+10 Unid.**, que recalcula el stock con la misma validación del backend. El rol cajero ve el módulo en solo lectura.

### Sucursales cadena (`frontend/src/screens/BranchesScreen.tsx`)

Cada sucursal se presenta como una tarjeta con nombre, badge ACTIVA, dirección, teléfono, **Mesas Activas x/y** e **Ingresos Hoy**, igual que en la maqueta, más los botones **Administrar esta Sucursal** (abre el dashboard con esa sucursal), **Editar datos** y **Desactivar** con confirmación. El alta se hace en un modal con nombre, dirección y teléfono.

Para no inventar cifras, el backend calculó las tres métricas en la misma consulta: `backend/src/models/sucursalModel.js` resuelve ahora `mesas_total`, `mesas_ocupadas` e `ingresos_hoy` (ventas de productos más sesiones finalizadas del día) con `LEFT JOIN LATERAL`, evitando una llamada al dashboard por cada sucursal. El cambio es aditivo: `GET /api/sucursales` conserva sus campos anteriores y no afecta a `BranchPicker`, al dashboard ni al POS.

### Usuarios y roles (`frontend/src/screens/UsersScreen.tsx`)

La pantalla reproduce los tres indicadores de la maqueta (Usuarios Activos, Admins de Sucursal, Cajeros / Operadores), la barra de filtros (búsqueda, rol y sucursal) y la tabla Usuario / Rol / Sucursal / Credencial / Estado / Acciones, con alta y edición en modal, activación o desactivación con un clic sobre el estado y baja con confirmación.

Decisiones tomadas en esta parte:

- **Credencial en lugar de PIN.** La maqueta muestra una columna “PIN Acceso” de 4 dígitos, pero el esquema `usuarios` no tiene ninguna columna PIN. Se optó por mostrar la credencial real (`@nombre` de usuario para el personal de sucursal, correo para el administrador general) en lugar de simular un PIN.
- **Sin credenciales falsas.** Al editar, el identificador enviado depende del rol: el administrador general se identifica con correo y `username: null`; el personal de sucursal, con nombre de usuario. La contraseña solo viaja cuando se escribe una nueva y el correo previo del personal de sucursal se conserva en lugar de sobrescribirlo con `null`.
- **Protección de la cuenta propia.** El administrador no puede desactivar, editar ni dar de baja su propia cuenta; el intento se informa en pantalla en lugar de ejecutarse contra el backend.
- **Listado con inactivas.** `GET /api/usuarios` excluye inactivos por defecto, así que se añadió `?inactivas=true` (`backend/src/models/usuarioModel.js` y `backend/src/controllers/usuarioController.js`) para que la tabla muestre el estado real de cada cuenta y los indicadores se calculen sobre toda la cadena. El filtro por rol y por sucursal se aplica en el cliente.

### Navegación entre sucursales

`frontend/App.tsx` conserva la sucursal elegida desde “Sucursales cadena” en el estado `dashboardBranchId` y la entrega al dashboard con la nueva prop `initialBranchId` de `DashboardScreen`; al entrar al dashboard desde el menú ese valor se limpia. Los demás módulos (POS, reservas, historial, caja, reportes y mesas) no cambian de comportamiento.

### Ajustes de conexión e impresión del mismo ciclo

`frontend/src/services/api.ts` resuelve la URL de la API en tiempo de ejecución con `expo-constants`: descarta las URLs de loopback cuando la app corre en Android y usa la IP del host de Metro con el puerto 3000, de modo que el teléfono ya no apunta a sí mismo. El login muestra la URL del servidor en modo `__DEV__` y la añade al mensaje de error de red para diagnosticar la conexión. En el historial, la impresión del comprobante abre la ventana con un retardo corto y el marcado ya inyectado, evitando la hoja en blanco.

### Verificación

- `npm run check`: 30 pruebas del backend aprobadas y typecheck del frontend sin errores.
- Consulta de solo lectura a la base configurada: `GET /api/sucursales` devolvió `mesas_total=4`, `mesas_ocupadas=0` e `ingresos_hoy=24.00`; `GET /api/usuarios?inactivas=true` devolvió 4 cuentas reales (un administrador general, un administrador de sucursal y dos cajeros).
- No se escribieron datos de negocio: la verificación se hizo con consultas de lectura y el script temporal usado para comprobarlas se eliminó.

**Pendiente:** recorrido visual autenticado en navegador y en Android de las tres pantallas (el navegador del entorno de trabajo no estuvo disponible durante esta continuación) y validación de los diálogos en un dispositivo nativo.

## Continuación 2026-11-12 — Configuración de la aplicación

El estudiante pidió desarrollar la parte de configuración con la apariencia de la maqueta `DATA TO BUILD/index.html`, que en este caso es un panel lateral de ajustes (“Configuración App”) y no una sección del menú principal. Como en los módulos anteriores, la maqueta solo sirve de referencia visual: todo lo que se guarda es real y persiste en la base de datos.

### Qué se desarrolló

`frontend/src/screens/SettingsScreen.tsx` reproduce el panel de la maqueta con las mismas secciones y controles:

- **Apariencia / Tema**: botones “Oscuro Lounge” y “Claro Ejecutivo”.
- **Idioma de Interfaz**: español o inglés.
- **Moneda del Sistema**: bolivianos, dólares o euros.
- **Facturación y Ticket PDF**: nombre comercial del ticket, IVA/impuesto y formato de impresión (ticket 80mm u hoja A4).
- Botón **Guardar y Aplicar Cambios**.

En la barra lateral se añadió el botón **Configuración App** con la píldora de idioma y moneda (`ES • Bs.`), igual que en la maqueta, y el pie conserva la pila técnica y el indicador de sesión.

### Decisiones tomadas

- **Persistencia real en la base de datos.** Se creó la tabla `configuraciones_usuario` (`backend/database/schema.sql` y la migración idempotente `backend/database/migrations/add_user_settings.sql`), con un registro por cuenta: tema, idioma, moneda, nombre comercial, IVA declarado y formato de impresión. La API `GET|PUT /api/configuraciones` solo opera sobre la cuenta autenticada y `PUT` acepta actualizaciones parciales. La migración se aplicó en la base configurada.
- **Solo se habilita lo que el cliente soporta.** El tema, el idioma y la moneda se guardan, pero únicamente están seleccionables el tema oscuro, el español y los bolivianos. El tema claro, el inglés y las otras monedas aparecen desactivados con su explicación: el cliente Expo se entrega con el tema oscuro existente, no hay traducción al inglés y no hay tasa de cambio configurada, así que no se habilitan opciones que luego no harían nada ni se inventan datos.
- **El IVA queda declarado, no calculado.** El valor se guarda como parámetro del salón y se indica en pantalla que el sistema no recalcula impuestos sobre los precios del catálogo, en coherencia con lo que ya 기록 el README sobre reportes y arqueo.
- **Nombre comercial y formato sí tienen efecto.** El comprobante que se imprime desde el historial usa el nombre comercial configurado como encabezado y arma la hoja en 80mm o A4 según el formato guardado.

### Verificación

- `npm run check`: 31 pruebas del backend aprobadas (se añadió una prueba de `validateSettings`) y typecheck del frontend sin errores.
- `npx expo export --platform web` compiló el bundle con 2306 módulos.
- Prueba HTTP contra la base real con un token de verificación: `GET` devolvió los valores por defecto (200), `PUT` guardó y devolvió 200, el `GET` posterior devolvió lo guardado, un `PUT` parcial solo cambió el formato de impresión, un `PUT` inválido respondió 400 `VALIDATION_ERROR` y la petición sin token respondió 401. La fila de prueba se eliminó al terminar.
- El backend en ejecución ya expone `GET /api/configuraciones` y responde 401 sin token.

**Pendiente:** recorrido visual autenticado en navegador y en Android del panel y de sus diálogos (el navegador del entorno de trabajo no estuvo disponible durante esta continuación) y validación en un dispositivo nativo.
