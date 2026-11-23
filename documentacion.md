# Documentación del Examen Integrador — Módulo de mantenimiento Bola8

## 1. Datos generales

- **Asignatura:** Desarrollo de Sistemas II
- **Proyecto:** Sistema Web Multi-Sucursal de Gestión de Billares Bola8
- **Módulo del examen:** Solicitudes de mantenimiento de equipos del salón
- **Adaptación:** el caso LabCare se trasladó al dominio de Bola8 (salón de billar multi-sucursal). LabCare se usa solo como referencia de requisitos.
- **Backend:** Node.js 20, Express 5, PostgreSQL, arquitectura MVC/API
- **Frontend:** React Native / Expo (web, Android e iOS)
- **Autenticación:** JWT con roles `admin_general`, `admin_sucursal` y `cajero`
- **Rama de trabajo:** `examen/apellido-nombre`
- **Fecha de ejecución:** 23 de noviembre de 2026

> En este documento no se registran contraseñas, cadenas de conexión, tokens ni datos personales. Las credenciales permanecen en `backend/.env`, que no se versiona.

---

## 2. Resumen de la solución

Se implementó una funcionalidad vertical completa dentro del proyecto Bola8:

1. **Base de datos:** tablas `equipos` y `solicitudes_mantenimiento`, con claves, restricciones, índices y datos semilla adaptados al salón de billar.
2. **Backend MVC:** modelos, controladores, rutas, validaciones y reglas de negocio separadas.
3. **Frontend Expo:** pantalla **Mantenimiento** con listado, búsqueda, filtros, alta, detalle, edición, cambio de estado y eliminación lógica.
4. **Pruebas:** 7 pruebas nuevas de validación/transiciones y 9 pruebas nuevas de controlador (16 en total); el total del backend pasó a **47 pruebas aprobadas**.
5. **Documentación:** `ANALISIS.md`, `README.md` actualizado y este archivo.

### 2.1 Correspondencia con el caso LabCare

| Caso LabCare | Adaptación Bola8 |
|---|---|
| Personal de laboratorio | Personal del salón (administrador o cajero autenticado) |
| Equipos de laboratorio | Mesas, bolas, tacos e iluminación del salón |
| Laboratorio / aula | Sucursal y ubicación interna |
| Solicitud de mantenimiento | Reporte de falla de un equipo |
| Catálogo `Equipo` | Tabla `equipos` por sucursal, estado `OPERATIVO` |
| `Solicitud.equipo_id` | `solicitudes_mantenimiento.id_equipo` |

La adaptación conserva todos los requerimientos y reglas del examen, agrega el alcance por sucursal propio de Bola8 y respeta los roles existentes.

---

## 3. Trabajo realizado por fases

### Fase 1 — Preparación y análisis

1. Se leyó el escenario completo del examen y se identificó el actor: personal del salón de billar.
2. Se revisó la estructura existente de Bola8: `backend/src/{models,controllers,routes,middlewares}`, `frontend/src/{screens,services,components}` y `backend/database`.
3. Se decidió **no** presentar LabCare como proyecto independiente: el módulo se integra al sistema semestral, que es lo que exige la adaptación solicitada.
4. Se redactó `ANALISIS.md` con:
   - actor y alcance;
   - 10 requerimientos funcionales;
   - 10 reglas de negocio;
   - diagrama UML simplificado de casos de uso;
   - esquema MVC/C4 con la ubicación de las validaciones.
5. Se definió que las reglas críticas se validan en el backend (middleware, dominio y controlador) y que la base de datos actúa como última barrera.

**Evidencia para el Word:** captura de `ANALISIS.md` y del diagrama UML/MVC.

---

### Fase 2 — Diseño y configuración de la base de datos

Se creó la migración idempotente:

```text
backend/database/migrations/add_mantenimiento_module.sql
```

Y se agregó el mismo bloque al esquema para bases nuevas:

```text
backend/database/schema.sql
```

#### 3.1 Tabla `equipos`

| Columna | Tipo | Restricción |
|---|---|---|
| `id_equipo` | BIGINT IDENTITY | PK |
| `codigo` | VARCHAR(20) | NOT NULL, UNIQUE |
| `nombre` | VARCHAR(120) | NOT NULL |
| `ubicacion` | VARCHAR(160) | NOT NULL |
| `estado` | VARCHAR(30) | CHECK `OPERATIVO`, `FUERA_DE_SERVICIO`, `MANTENIMIENTO` |
| `id_sucursal` | BIGINT | FK a `sucursales`, NOT NULL |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | DEFAULT `NOW()` |

#### 3.2 Tabla `solicitudes_mantenimiento`

| Columna | Tipo | Restricción |
|---|---|---|
| `id_solicitud` | BIGINT IDENTITY | PK |
| `codigo_solicitud` | VARCHAR(30) | NOT NULL, UNIQUE |
| `id_equipo` | BIGINT | FK a `equipos`, NOT NULL |
| `id_sucursal` | BIGINT | FK a `sucursales`, NOT NULL |
| `solicitante` | VARCHAR(120) | NOT NULL, mínimo 3 con `BTRIM` |
| `descripcion` | TEXT | NOT NULL, mínimo 10 con `BTRIM` |
| `prioridad` | VARCHAR(10) | CHECK `BAJA`, `MEDIA`, `ALTA` |
| `estado` | VARCHAR(20) | CHECK `PENDIENTE`, `EN_PROCESO`, `RESUELTA`, `CANCELADA` |
| `fecha_registro` | TIMESTAMPTZ | DEFAULT `NOW()` |
| `fecha_actualizacion` | TIMESTAMPTZ | DEFAULT `NOW()` |
| `activo` | BOOLEAN | DEFAULT `TRUE` (eliminación lógica) |

Además se agregaron índices para el listado activo, el equipo y el estado.

#### 3.3 Datos semilla adaptados

| Código | Nombre | Ubicación | Estado |
|---|---|---|---|
| EQ-001 | Mesa de billar profesional | Salón Principal | OPERATIVO |
| EQ-002 | Juego de bolas de billar | Mesa 1 | OPERATIVO |
| EQ-003 | Taco de billar profesional | Área de juego | OPERATIVO |
| EQ-004 | Lámpara colgante de mesa | Salón Principal | OPERATIVO |

El `INSERT` carga los equipos en la **primera sucursal existente** para respetar el alcance multi-sucursal. Si la base no tiene sucursales, no inserta datos y no falla; en ese caso primero se crea una sucursal desde la aplicación.

#### 3.4 Cómo ejecutar la migración

En una base existente:

```bash
psql "$DATABASE_URL" -f backend/database/migrations/add_mantenimiento_module.sql
```

También se puede pegar el contenido en el SQL Editor de Supabase o en pgAdmin.

En una base nueva, `backend/database/schema.sql` ya incluye las tablas y los datos semilla.

**Evidencia para el Word:**

- captura de la migración ejecutada;
- captura de las tablas en pgAdmin/Supabase;
- captura de la relación `solicitudes_mantenimiento.id_equipo → equipos.id_equipo`;
- captura de los cuatro equipos semilla.

---

### Fase 3 — Backend bajo MVC

#### 3.5 Archivos creados

| Archivo | Responsabilidad |
|---|---|
| `backend/src/domain/solicitud.js` | Prioridades, estados, transiciones y `canTransition()` |
| `backend/src/models/equipoModel.js` | Consultas parametrizadas de equipos operativos |
| `backend/src/models/solicitudModel.js` | Listado con filtros, detalle, código único, alta, edición, estado y baja lógica |
| `backend/src/controllers/equipoController.js` | Listado de equipos por sucursal |
| `backend/src/controllers/solicitudController.js` | Coordinación de las operaciones y respuestas HTTP |
| `backend/src/routes/equipoRoutes.js` | Ruta `GET /api/equipos` |
| `backend/src/routes/solicitudRoutes.js` | Rutas CRUD y cambio de estado |
| `backend/src/middlewares/validate.js` | Validadores `validateSolicitudCreate/Update/Status` |
| `backend/src/middlewares/auth.js` | Alcance de sucursal para el recurso `solicitud` |
| `backend/src/routes/index.js` | Registro de `/solicitudes` y `/equipos` |

#### 3.6 Endpoints implementados

| Acción | Método y ruta | Resultado esperado | Códigos |
|---|---|---|---|
| Listar activas | `GET /api/solicitudes?id_sucursal=&q=&prioridad=&estado=` | Solicitudes activas con datos del equipo | 200, 400 |
| Detalle | `GET /api/solicitudes/:id` | Una solicitud completa | 200, 404 |
| Crear | `POST /api/solicitudes` | Código único, estado `PENDIENTE` | 201, 400 |
| Editar | `PUT /api/solicitudes/:id` | Solo campos descriptivos | 200, 400, 404 |
| Cambiar estado | `PATCH /api/solicitudes/:id/estado` | Solo transición permitida | 200, 400, 404, 409 |
| Eliminar lógico | `DELETE /api/solicitudes/:id` | `activo=false`, sin `DELETE` físico | 200, 404 |
| Equipos operativos | `GET /api/equipos?id_sucursal=` | Catálogo seleccionable | 200, 400 |

Respuesta de ejemplo al crear:

```json
{
  "data": {
    "id_solicitud": 1,
    "codigo_solicitud": "SOL-20261123-001",
    "estado": "PENDIENTE",
    "prioridad": "ALTA",
    "equipo": "Mesa de billar profesional",
    "equipo_codigo": "EQ-001",
    "equipo_ubicacion": "Salón Principal"
  },
  "message": "Solicitud de mantenimiento registrada correctamente."
}
```

#### 3.7 Generación del código único

`codigo_solicitud` se genera en el servidor con formato `SOL-AAAAMMDD-XXX`:

1. se abre una transacción;
2. se toma `pg_advisory_xact_lock` para serializar la generación;
3. se obtiene la fecha del servidor;
4. se busca el último código del día;
5. se incrementa el correlativo y se inserta la solicitud;
6. la restricción `UNIQUE` es el respaldo final.

El cliente no puede enviar el código, el estado inicial, la fecha de registro ni el campo `activo`.

#### 3.8 Validaciones en el backend

- `id_equipo` entero positivo; el equipo debe existir, pertenecer a la sucursal y estar `OPERATIVO`.
- `solicitante` con `trim`, mínimo 3 y máximo 120 caracteres.
- `descripcion` con `trim`, mínimo 10 y máximo 2000 caracteres.
- `prioridad` normalizada y limitada a `BAJA`, `MEDIA`, `ALTA`.
- estado inicial fijado por el servidor en `PENDIENTE`.
- transición comprobada con `canTransition()`; transición inválida responde `409`.
- detalle, edición, estado y eliminación de un ID inexistente responden `404`.
- filtros de prioridad/estado inválidos responden `400`.
- usuarios de sucursal solo acceden a su propia sucursal.

#### 3.9 Seguridad

- Todas las rutas usan JWT mediante `requireAuth`.
- Los roles se validan con `requireRole`: editar, cambiar estado y eliminar requieren administrador; los cajeros pueden listar, consultar y registrar.
- Las consultas usan parámetros `$1`, `$2`, etc.; no hay concatenación de datos del usuario.
- Los errores se devuelven sanitizados por `error-handler.js`; no se exponen trazas ni credenciales.
- Las credenciales siguen en `backend/.env` y `backend/.env.example` usa un valor de ejemplo.

**Evidencia para el Word:**

- captura de la estructura MVC en VS Code;
- captura de Postman/Thunder Client con `POST /api/solicitudes` exitoso;
- captura de `GET /api/solicitudes` con filtros;
- captura de `PATCH` inválido con `409`;
- captura de `DELETE` con `activo=false` y consulta SQL posterior.

---

### Fase 4 — Frontend e integración

#### 3.10 Archivos creados

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/services/maintenance.ts` | Tipos y llamadas a la API de equipos y solicitudes |
| `frontend/src/components/MaintenanceFormModal.tsx` | Formulario de alta/edición con selección de equipo y prioridad |
| `frontend/src/screens/MaintenanceScreen.tsx` | Pantalla completa del módulo |
| `frontend/App.tsx` | Nueva entrada **Mantenimiento** en la navegación |

#### 3.11 Funcionalidad de la pantalla

- Selector de sucursal con `BranchPicker`.
- Buscador por código, solicitante o equipo (consulta al servidor con `q`).
- Filtros por prioridad y estado.
- Resumen de solicitudes en la vista: total, pendientes, en proceso y resueltas.
- Listado en tabla para escritorio y tarjetas para móvil.
- Formulario con equipo operativo, solicitante, descripción y prioridad.
- Detalle completo de la solicitud.
- Edición de datos descriptivos.
- Diálogo de cambio de estado que solo muestra las transiciones permitidas.
- Confirmación antes de la eliminación lógica.
- Mensajes de éxito/error únicamente **después** de la respuesta del servidor.
- Los cajeros ven el listado y pueden registrar, pero no editar, cambiar estado ni eliminar.

#### 3.12 Cómo probar la pantalla

1. Iniciar el backend:

   ```bash
   npm start
   ```

2. Iniciar Expo Web:

   ```bash
   npm run frontend:web
   ```

3. Iniciar sesión con una cuenta de administrador.
4. Abrir **Mantenimiento** en la barra lateral.
5. Seleccionar la sucursal.
6. Registrar una solicitud con un equipo operativo.
7. Verificar el mensaje de éxito y el código `SOL-AAAAMMDD-XXX`.
8. Abrir el detalle, editar, cambiar el estado y eliminar lógicamente.
9. Recargar la página y comprobar que los datos persisten.

**Evidencia para el Word:**

- captura de la pantalla vacía;
- captura del formulario de alta;
- captura del mensaje de éxito con el código generado;
- captura del listado con todos los campos;
- captura del detalle;
- captura de edición;
- captura del cambio `PENDIENTE → EN_PROCESO`;
- captura del intento inválido `RESUELTA → PENDIENTE`;
- captura de la validación negativa de solicitante/descripción;
- captura de la confirmación de eliminación;
- captura del listado sin la solicitud eliminada;
- captura de la consulta SQL que muestra la fila con `activo=false`.

---

### Fase 5 — Pruebas, depuración y seguridad

#### 3.13 Comandos ejecutados

```bash
npm --prefix backend run check
npm --prefix frontend run typecheck
```

#### 3.14 Resultado real de la ejecución

- **Backend:** `node --check src/server.js` aprobado; **47 pruebas aprobadas, 0 fallidas**.
- **Frontend:** `tsc --noEmit` aprobado, sin errores de tipos.
- Las pruebas nuevas no requieren PostgreSQL: usan validadores y controladores con modelos simulados, por lo que verifican reglas sin tocar datos reales.

Pruebas nuevas agregadas:

```text
backend/tests/solicitud.test.js
  - normalización de datos correctos
  - rechazo de solicitante < 3
  - rechazo de descripción < 10
  - rechazo de prioridad inválida
  - rechazo de equipo inválido
  - normalización del estado
  - transiciones permitidas y prohibidas

backend/tests/solicitud-controller.test.js
  - alta con equipo operativo
  - rechazo de equipo inexistente/no operativo
  - sucursal obligatoria para admin general
  - cambio de estado permitido
  - rechazo 409 de RESUELTA → PENDIENTE
  - 404 en detalle y eliminación inexistente
  - eliminación lógica activo=false
  - filtros válidos y rechazo de filtros inválidos
```

#### 3.15 Matriz de pruebas del examen

| ID | Acción / datos | Resultado esperado | Resultado real / estado |
|---|---|---|---|
| CP-01 | Registrar solicitud válida con equipo existente | PENDIENTE, código único y persistencia | **NO EJECUTADO** — cubierto por prueba de controlador; falta ejecución con PostgreSQL real y captura |
| CP-02 | Solicitante vacío o con menos de 3 caracteres | El backend rechaza y no guarda | **APROBADO** — `solicitud.test.js` |
| CP-03 | Descripción vacía o con menos de 10 caracteres | El backend rechaza y no guarda | **APROBADO** — `solicitud.test.js` |
| CP-04 | Prioridad distinta de BAJA, MEDIA o ALTA | El backend rechaza el valor | **APROBADO** — `solicitud.test.js` |
| CP-05 | Seleccionar equipo inexistente | Rechaza y no crea solicitud huérfana | **APROBADO** — `solicitud-controller.test.js` (modelo de datos simulado) |
| CP-06 | Editar una solicitud existente | Actualiza solo el registro seleccionado | **NO EJECUTADO** — requiere PostgreSQL real |
| CP-07 | Cambiar PENDIENTE a EN_PROCESO | La transición se acepta | **APROBADO** — `solicitud.test.js` y prueba de controlador |
| CP-08 | Cambiar RESUELTA a PENDIENTE | Se rechaza y el estado no cambia | **APROBADO** — `409 STATE_TRANSITION_NOT_ALLOWED` en prueba de controlador |
| CP-09 | Eliminar lógicamente una solicitud | Sale del listado y permanece con activo=false | **NO EJECUTADO** — la prueba de controlador verifica `activo=false`; falta confirmar en PostgreSQL |
| CP-10 | Buscar por solicitante/equipo y filtrar prioridad/estado | Solo coincidencias válidas | **NO EJECUTADO** — requiere PostgreSQL real |
| CP-11 | Consultar o editar un ID inexistente | Responde 404 controlado | **APROBADO** — prueba de controlador |
| CP-12 | Recargar la aplicación después de registrar | Los datos siguen disponibles | **NO EJECUTADO** — requiere PostgreSQL real y navegador |

> **Importante:** las pruebas de PostgreSQL y de interfaz deben ejecutarse y capturarse antes de marcar CP-01, CP-06, CP-09, CP-10 y CP-12 como APROBADO en el documento Word. No se deben declarar aprobadas sin evidencia.

#### 3.16 Pruebas manuales sugeridas con SQL

```sql
-- Equipos semilla
SELECT id_equipo, codigo, nombre, ubicacion, estado, id_sucursal
FROM equipos ORDER BY codigo;

-- Solicitudes activas
SELECT id_solicitud, codigo_solicitud, id_equipo, solicitante,
       prioridad, estado, activo, fecha_registro
FROM solicitudes_mantenimiento
WHERE activo = TRUE
ORDER BY fecha_registro DESC;

-- Verificar una baja lógica
SELECT id_solicitud, codigo_solicitud, activo, fecha_actualizacion
FROM solicitudes_mantenimiento
WHERE id_solicitud = :id;
```

Prueba negativa por API (reemplazar el token y el ID):

```bash
curl -X PATCH http://localhost:3000/api/solicitudes/1/estado \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"estado":"PENDIENTE"}'
```

Respuesta esperada cuando la solicitud está `RESUELTA`:

```json
{
  "error": {
    "code": "STATE_TRANSITION_NOT_ALLOWED",
    "message": "No se puede cambiar la solicitud de RESUELTA a PENDIENTE."
  }
}
```

---

### Fase 6 — Git, documentación y entrega

#### 3.17 Rama y commits

La rama de trabajo ya existe:

```bash
git branch --show-current
# examen/apellido-nombre
```

> Antes de publicar, reemplaza `apellido-nombre` por tus datos reales si el docente exige el nombre completo en la rama, por ejemplo `examen/perez-juan`.

Commits realizados:

```bash
# Código del módulo, esquema, pruebas y análisis
git commit -m "feat: agrega modulo de mantenimiento de equipos al sistema Bola8"
# 7832d1b

# Documentación del examen
git commit -m "docs: documenta el examen integrador adaptado a Bola8"
```

Buenas prácticas aplicadas:

- no se versionan `.env`, `node_modules`, bases de datos ni archivos temporales;
- `backend/.env.example` usa valores de ejemplo;
- el README explica cómo ejecutar el proyecto;
- la documentación distingue pruebas ejecutadas de pendientes.

**Evidencia para el Word:** captura de `git status`, `git log --oneline --decorate` y del repositorio en GitHub.

---

## 4. Inventario de cambios

### 4.1 Archivos nuevos

```text
ANALISIS.md
backend/database/migrations/add_mantenimiento_module.sql
backend/src/domain/solicitud.js
backend/src/models/equipoModel.js
backend/src/models/solicitudModel.js
backend/src/controllers/equipoController.js
backend/src/controllers/solicitudController.js
backend/src/routes/equipoRoutes.js
backend/src/routes/solicitudRoutes.js
backend/tests/solicitud.test.js
backend/tests/solicitud-controller.test.js
frontend/src/services/maintenance.ts
frontend/src/components/MaintenanceFormModal.tsx
frontend/src/screens/MaintenanceScreen.tsx
```

### 4.2 Archivos modificados

```text
backend/database/schema.sql
backend/src/middlewares/validate.js
backend/src/middlewares/auth.js
backend/src/routes/index.js
frontend/App.tsx
README.md
documentacion.md
```

---

## 5. Evidencias que deben incluirse en el documento Word

Prepare entre **12 y 20 capturas numeradas**. Cada captura debe llevar:

- número y título;
- objetivo;
- pasos ejecutados;
- resultado observado;
- caso de prueba (CP) asociado, si corresponde.

### 5.1 Lista recomendada

1. **Portada y datos del estudiante.** Captura o texto del documento final con nombre, C.I., materia, docente y fecha.
2. **`ANALISIS.md`.** Captura del actor, alcance, requerimientos y reglas.
3. **Diagrama UML de casos de uso.** Captura del diagrama de `ANALISIS.md` o de la herramienta usada.
4. **Esquema MVC/C4.** Captura del diagrama con la ubicación de las validaciones.
5. **Script SQL.** Captura de `add_mantenimiento_module.sql` o de su ejecución exitosa.
6. **Tabla `equipos` en pgAdmin/Supabase.** Captura de columnas, PK y `UNIQUE(codigo)`.
7. **Tabla `solicitudes_mantenimiento`.** Captura de columnas, PK, FK a `equipos` y checks.
8. **Relación entre tablas.** Captura del diagrama de relación o de la consulta con `JOIN`.
9. **Datos semilla.** Captura de los cuatro equipos `EQ-001` a `EQ-004`.
10. **Estructura MVC en el editor.** Captura de `models`, `controllers`, `routes`, `domain` y `tests`.
11. **Pantalla de Mantenimiento vacía.** Captura de la navegación y la pantalla.
12. **Formulario de alta.** Captura con equipo, solicitante, descripción y prioridad.
13. **Registro exitoso.** Captura del mensaje y del código `SOL-AAAAMMDD-XXX` generado.
14. **Listado completo.** Captura con código, equipo, solicitante, prioridad, estado y fecha.
15. **Detalle de solicitud.** Captura del modal de detalle.
16. **Edición.** Captura del formulario con datos precargados y mensaje de actualización.
17. **Cambio de estado válido.** Captura de `PENDIENTE → EN_PROCESO`.
18. **Transición inválida.** Captura del intento `RESUELTA → PENDIENTE` con mensaje/HTTP 409.
19. **Validaciones negativas.** Captura de solicitante corto o descripción corta rechazados por el backend (Postman o UI).
20. **Búsqueda y filtros.** Captura de una búsqueda por solicitante/equipo y filtros combinados.
21. **Eliminación lógica.** Captura de la confirmación y del listado sin la solicitud.
22. **Verificación en base de datos.** Captura de la fila eliminada con `activo=false`.
23. **Persistencia tras recargar.** Captura de la pantalla recargada con los datos.
24. **Pruebas automatizadas.** Captura de `npm --prefix backend run check` con 47 pruebas aprobadas.
25. **Typecheck del frontend.** Captura de `npm --prefix frontend run typecheck` sin errores.
26. **Git.** Captura de `git status` y `git log --oneline --decorate`.
27. **GitHub.** Captura del repositorio y del enlace compartido.
28. **Registro de IA.** Captura o tabla incluida en el mismo Word.

### 5.2 Orden sugerido del documento

1. Portada.
2. Índice automático.
3. Introducción y objetivo.
4. Análisis y alcance.
5. UML y arquitectura MVC/C4.
6. Base de datos: script, tablas, relación y semilla.
7. Backend: endpoints, generación de código, validaciones y seguridad.
8. Frontend: pantalla y recorrido.
9. Matriz de pruebas.
10. Evidencias (capturas).
11. Respuestas teóricas.
12. Registro de uso de IA.
13. Conclusiones.
14. Enlace de GitHub y anexos.

---

## 6. Pasos para crear el documento Word

1. Abrir Microsoft Word y crear un documento nuevo.
2. **Portada:** insertar el logo o nombre de la UPDS, la asignatura, el título “Examen Integrador — Módulo de Mantenimiento Bola8”, nombre completo, C.I., docente y fecha.
3. **Índice automático:** aplicar estilos Título 1, Título 2 y Título 3 a las secciones; luego ir a **Referencias → Tabla de contenido**.
4. **Configurar estilos:** fuente Calibri o Arial 11, interlineado 1.15, márgenes normales y numeración de páginas en el pie.
5. **Copiar el contenido:** trasladar las secciones 1 a 4 de este archivo, corrigiendo los datos personales que falten.
6. **Insertar diagramas:** usar **Insertar → Formas** para el UML y el C4, o pegar una imagen exportada. Añadir pie de figura (“Figura 1. Casos de uso del módulo de mantenimiento”).
7. **Insertar capturas:** **Insertar → Imágenes → Este dispositivo**. Ajustar al ancho de la página sin recortar texto y agregar pie de figura con número y descripción.
8. **Matriz de pruebas:** copiar la tabla de la sección 3.15 y completar únicamente los resultados ejecutados. No cambiar “NO EJECUTADO” por “APROBADO” sin evidencia.
9. **Respuestas teóricas:** copiar la sección 8 y revisar que cada respuesta mencione el caso Bola8.
10. **Registro de IA:** copiar la tabla de la sección 9 o resumirla.
11. **Enlaces:** agregar el enlace del repositorio GitHub y la lista de archivos entregados.
12. **Revisar ortografía:** **Revisar → Ortografía y gramática**.
13. **Exportar a PDF:** **Archivo → Guardar como → PDF**. Verificar que ninguna captura quede cortada y que el índice sea legible.
14. **Cargar en Moodle:** subir el PDF y entregar el ZIP del proyecto con el nombre sugerido `DSII_ExamenIntegrador_ApellidoNombre.zip`.
15. **Verificar el ZIP:** debe contener el código fuente, `ANALISIS.md`, `README.md`, la migración SQL y este documento; no debe incluir `node_modules`, `.env` ni bases de datos.

---

## 7. Checklist de entrega

- [ ] Código fuente completo y ejecutable.
- [ ] Migración `add_mantenimiento_module.sql` y bloque en `schema.sql`.
- [ ] Tablas `equipos` y `solicitudes_mantenimiento` creadas.
- [ ] Cuatro equipos semilla cargados.
- [ ] `ANALISIS.md` con UML y MVC/C4.
- [ ] `README.md` con pasos de ejecución.
- [ ] Pantalla de Mantenimiento integrada.
- [ ] CRUD, búsqueda, filtros y cambio de estado funcionando.
- [ ] Eliminación lógica verificada en PostgreSQL.
- [ ] 47 pruebas del backend aprobadas.
- [ ] Typecheck del frontend aprobado.
- [ ] Matriz de pruebas completada con evidencia.
- [ ] Capturas numeradas.
- [ ] PDF exportado y cargado en Moodle.
- [ ] Rama `examen/apellido-nombre` y commits.
- [ ] Repositorio publicado en GitHub.
- [ ] Registro de uso de IA.
- [ ] Sin secretos, `.env`, `node_modules` ni datos sensibles en el repositorio.

---

## 8. Respuestas teóricas (10 puntos)

### 8.1 Explique la responsabilidad de Modelo, Vista y Controlador dentro de MVC. Indique qué componente debería validar una regla de negocio y por qué.

El **Modelo** representa los datos y el acceso a la base de datos; en este módulo son `equipoModel.js` y `solicitudModel.js`, que ejecutan consultas parametrizadas. La **Vista** presenta la información al usuario; aquí es la pantalla Expo `MaintenanceScreen.tsx` y el modal de formulario. El **Controlador** recibe la petición HTTP, coordina las validaciones, invoca al modelo y construye la respuesta; en el proyecto es `solicitudController.js`.

Una regla de negocio debe validarse en el **backend**, idealmente en el controlador y en un módulo de dominio (`domain/solicitud.js`), porque el cliente puede modificarse o enviarse una petición directa con Postman. El servidor es la autoridad y la base de datos refuerza la integridad con `CHECK`, `UNIQUE` y `FOREIGN KEY`. Ejemplo: la transición `RESUELTA → PENDIENTE` se rechaza en el servidor con `409`, aunque la interfaz no muestre esa opción.

### 8.2 ¿Qué diferencia existe entre POST, PUT y PATCH? Mencione una operación de Bola8 que corresponda a cada método.

- **POST** crea un recurso nuevo. En Bola8, `POST /api/solicitudes` registra una solicitud de mantenimiento y devuelve `201`.
- **PUT** reemplaza o actualiza el recurso completo con los datos enviados. En Bola8, `PUT /api/solicitudes/:id` actualiza los campos descriptivos de una solicitud existente.
- **PATCH** modifica parcialmente un recurso. En Bola8, `PATCH /api/solicitudes/:id/estado` cambia únicamente el estado.

### 8.3 ¿Por qué las validaciones del frontend no sustituyen a las validaciones del backend? Dé un ejemplo del examen.

Porque el frontend es controlado por el usuario: se puede desactivar JavaScript, modificar el HTML, usar la consola o enviar una petición directamente con Postman/curl. El backend debe proteger la integridad sin confiar en el cliente. Ejemplo: el formulario de Mantenimiento exige 3 caracteres de solicitante y 10 de descripción por usabilidad, pero `validateSolicitudCreate` vuelve a comprobar ambos en el servidor; si se envía `"A"` como solicitante, la API responde `400 VALIDATION_ERROR` y no guarda nada.

### 8.4 ¿Qué es una prueba negativa? Escriba un caso de prueba negativo para el cambio de estado de una solicitud.

Una prueba negativa verifica que el sistema **rechace** datos o acciones inválidas y conserve el estado consistente. Caso: con una solicitud en estado `RESUELTA`, enviar `PATCH /api/solicitudes/:id/estado` con `{"estado":"PENDIENTE"}`. Resultado esperado: HTTP `409` con código `STATE_TRANSITION_NOT_ALLOWED`, sin modificar el estado en la base de datos. Este caso está cubierto por `solicitud-controller.test.js` y debe capturarse también desde la interfaz o Postman.

### 8.5 ¿Qué significa utilizar IA de forma responsable en desarrollo? Mencione una forma concreta de verificar una sugerencia generada por IA.

Significa usar la IA como apoyo, no como sustituto de la comprensión: revisar el código sugerido, no compartir credenciales ni datos sensibles, ejecutarlo, probarlo y poder explicar cada fragmento incorporado. Una verificación concreta es ejecutar `npm --prefix backend run check` y `npm --prefix frontend run typecheck` después de integrar una sugerencia; además, probar el endpoint con casos válidos y negativos y revisar que las consultas SQL usen parámetros. En este trabajo también se revisó que las transiciones coincidieran con la matriz del examen antes de aceptar el código.

---

## 9. Registro de uso de IA

| Herramienta y prompt resumido | Sugerencia recibida | Qué se verificó / decisión |
|---|---|---|
| Asistente de código — “analiza el examen LabCare y adáptalo al sistema de billar Bola8” | Separar el módulo en dominio, modelo, controlador, rutas, validaciones y pantalla Expo | Se revisó la arquitectura existente de Bola8 y se reutilizaron sus patrones MVC, JWT y alcance por sucursal |
| Asistente de código — “implementa el backend del módulo de mantenimiento” | Modelos con consultas parametrizadas, validadores y transiciones | Se ejecutaron las 47 pruebas del backend; se corrigió una lectura de `query` opcional y se verificó que no se concatenara SQL |
| Asistente de código — “crea la pantalla de mantenimiento en Expo” | Pantalla con filtros, formulario, detalle y diálogos | Se ejecutó `tsc --noEmit` sin errores y se revisó que los mensajes se muestren después de la respuesta del servidor |
| Asistente de código — “documenta pasos y evidencias para Word” | Estructura de documentación, matriz y checklist | Se ajustó la matriz para no marcar como aprobadas las pruebas que requieren PostgreSQL real; se dejaron instrucciones de captura |

**Declaración:** las sugerencias se revisaron y ejecutaron; no se incorporaron credenciales ni datos personales. Las pruebas que dependen de una base real quedaron marcadas como pendientes de ejecución y captura.

---

## 10. Conclusión

El módulo de mantenimiento quedó integrado a Bola8 como una funcionalidad vertical completa: base de datos con integridad, backend MVC con reglas de negocio y seguridad, frontend Expo conectado a la API y pruebas automatizadas. La adaptación de LabCare al dominio de billar conserva los requerimientos del examen y agrega el alcance multi-sucursal y los roles propios del sistema semestral. Antes de la entrega, deben completarse las capturas y las pruebas que requieren PostgreSQL real, y exportar el documento a PDF.
