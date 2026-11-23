# Documentacion del Examen Integrador LabCare

## 1. Datos generales

- Sistema: LabCare - Gestión de solicitudes de mantenimiento
- Asignatura: Desarrollo de Sistemas II
- Proyecto de examen: carpeta independiente `LabCare/`
- Implementación: API REST MVC + interfaz web responsive
- Motor: PostgreSQL

## 2. Alcance realizado

Se implementó el módulo vertical LabCare sin presentar el proyecto semestral Bola8 como solución del examen.

Funcionalidades:

- listado de solicitudes activas;
- registro con equipo existente;
- consulta de detalle;
- edición descriptiva;
- cambio de estado con flujo controlado;
- eliminación lógica;
- búsqueda por código, solicitante o equipo;
- filtros por prioridad y estado;
- persistencia PostgreSQL;
- mensajes claros de éxito, validación y error.

## 3. Preparación y entorno

1. Se creó la carpeta `LabCare/`.
2. Se creó `LabCare/package.json` con Node.js y Express.
3. Se instaló PostgreSQL/driver `pg` y las dependencias con `npm install`.
4. Se creó `LabCare/.env.example`; el estudiante debe copiarlo a `.env` y completar `DATABASE_URL` local.
5. Se ejecutó `npm test` y `npm run check`.
6. Se inició el servidor con `npm start`.
7. Se verificó la interfaz en `http://127.0.0.1:3001`.

## 4. Diseño

### 4.1 Actor

Personal de laboratorio.

### 4.2 Casos de uso

- registrar solicitud;
- listar solicitudes;
- consultar detalle;
- editar solicitud;
- cambiar estado;
- buscar y filtrar;
- eliminar lógicamente.

El diagrama UML breve y el esquema MVC/C4 están en [ANALISIS.md](LabCare/ANALISIS.md).

### 4.3 Arquitectura

```text
Navegador HTML/CSS/JS
        |
        | fetch JSON
        v
Express / rutas
        |
        v
Controladores
        |
        v
Modelos parametrizados
        |
        v
PostgreSQL
```

## 5. Base de datos

El script ejecutable es [schema.sql](LabCare/database/schema.sql).

Se crean:

- `equipos`: clave primaria, código único, nombre, ubicación y estado;
- `solicitudes`: clave primaria, código único, equipo_id como clave foránea, solicitante, descripción, prioridad, estado, fechas y activo.

Restricciones implementadas:

- equipos y códigos únicos;
- clave foránea solicitud -> equipo;
- prioridad limitada a BAJA/MEDIA/ALTA;
- estado limitado a PENDIENTE/EN_PROCESO/RESUELTA/CANCELADA;
- NOT NULL;
- longitud mínima para solicitante y descripción;
- eliminación lógica mediante activo=false.

Datos semilla incluidos:

| Código | Nombre | Ubicación |
|---|---|---|
| EQ-001 | Computadora de escritorio | Laboratorio 1 |
| EQ-002 | Proyector multimedia | Aula 204 |
| EQ-003 | Router de laboratorio | Laboratorio de Redes |
| EQ-004 | Impresora de oficina | Secretaría |

## 6. Organización MVC

- Configuración: [db.js](LabCare/src/config/db.js)
- Modelos: [equiposModel.js](LabCare/src/models/equiposModel.js) y [solicitudesModel.js](LabCare/src/models/solicitudesModel.js)
- Controladores: [solicitudesController.js](LabCare/src/controllers/solicitudesController.js) y [equiposController.js](LabCare/src/controllers/equiposController.js)
- Rutas: [solicitudesRoutes.js](LabCare/src/routes/solicitudesRoutes.js) y [equiposRoutes.js](LabCare/src/routes/equiposRoutes.js)
- Frontend: [index.html](LabCare/public/index.html), [app.js](LabCare/public/app.js) y [styles.css](LabCare/public/styles.css)
- Errores: [error-handler.js](LabCare/src/middlewares/error-handler.js)

## 7. Validaciones y seguridad

El backend valida:

- equipo existente y operativo;
- solicitante >= 3 caracteres después de trim;
- descripción >= 10 caracteres después de trim;
- prioridad permitida;
- estado inicial PENDIENTE;
- transiciones de estado;
- identificador existente.

Las consultas usan parámetros `$1`, `$2`, etc., no concatenación de datos del usuario. Los errores se devuelven con mensajes sanitizados y códigos HTTP apropiados. Las credenciales no están en el código ni en archivos versionados.

## 8. Comandos ejecutados

```bash
cd "LabCare"
npm install
npm test
npm run check
npm start
```

## 9. Resultado de validación

Ejecución real al preparar el examen:

- `npm install`: aprobado, 84 paquetes y cero vulnerabilidades.
- `npm test`: 9 pruebas aprobadas, 0 fallidas.
- `npm run check`: aprobado.
- Página `http://127.0.0.1:3001`: HTTP 200.
- `GET /api/health`: HTTP 503 esperado porque no existe `.env` ni `DATABASE_URL` en el laboratorio actual.

Por eso no se marcaron como APROBADAS las pruebas que dependen de PostgreSQL real. Se deben ejecutar al cargar una base y registrar el resultado real.

## 10. Matriz de pruebas

| ID | Acción / datos | Resultado esperado | Resultado real / estado |
|---|---|---|---|
| CP-01 | Registrar solicitud válida y equipo existente | PENDIENTE, código único y persistencia | NO EJECUTADO — requiere PostgreSQL configurado |
| CP-02 | Solicitante vacío o menor a 3 | Rechaza 400 y no guarda | APROBADO — prueba `utils.test.js` |
| CP-03 | Descripción vacía o menor a 10 | Rechaza 400 y no guarda | APROBADO — prueba `utils.test.js` |
| CP-04 | Prioridad inválida | Rechaza 400 | APROBADO — prueba `utils.test.js` |
| CP-05 | Equipo inexistente | Rechaza sin huérfano | NO EJECUTADO — requiere PostgreSQL configurado |
| CP-06 | Editar solicitud existente | Actualiza solo registro seleccionado | NO EJECUTADO — requiere PostgreSQL configurado |
| CP-07 | PENDIENTE -> EN_PROCESO | Transición aceptada | APROBADO — prueba `utils.test.js` |
| CP-08 | RESUELTA -> PENDIENTE | Transición rechazada | APROBADO — prueba `utils.test.js` |
| CP-09 | Eliminación lógica | Sale del listado y activo=false | NO EJECUTADO — requiere PostgreSQL configurado |
| CP-10 | Buscar y filtrar | Solo coincidencias válidas | NO EJECUTADO — requiere PostgreSQL configurado |
| CP-11 | ID inexistente | 404 controlado | NO EJECUTADO — requiere ejecución HTTP con base |
| CP-12 | Recarga posterior | Datos persisten | NO EJECUTADO — requiere PostgreSQL configurado |

## 11. Evidencias que deben añadirse al documento Word

Prepare entre 8 y 12 capturas numeradas. Recomendación:

1. Captura de `ANALISIS.md` con requisitos y reglas.
2. Captura del diagrama UML/MVC.
3. Captura de pgAdmin creando la tabla `equipos` o el script ejecutado.
4. Captura de pgAdmin creando la tabla `solicitudes` y sus claves.
5. Captura de los 4 equipos semilla consultados.
6. Captura de VS Code mostrando la estructura MVC.
7. Captura del formulario antes de registrar.
8. Captura de registro válido y mensaje de éxito.
9. Captura del listado con código, equipo, solicitante, prioridad, estado y fecha.
10. Captura de detalle.
11. Captura de edición.
12. Captura de cambio PENDIENTE -> EN_PROCESO.
13. Captura de intento negativo RESUELTA -> PENDIENTE con 409.
14. Captura de validación negativa solicitante o descripción con 400.
15. Captura de búsqueda y filtros combinados.
16. Captura de eliminación lógica y registro activo=false en PostgreSQL.
17. Captura de recarga conservando datos.
18. Captura de `npm test` con 9 pruebas aprobadas.
19. Captura de `git status` y `git log`.
20. Captura del repositorio GitHub si se publicó.

Para cada captura escriba:

- número y título;
- objetivo;
- pasos ejecutados;
- resultado observado;
- caso CP asociado.

## 12. Pasos para crear el documento Word

1. Abra Microsoft Word.
2. Cree una portada con UPDS, asignatura, título, nombre, C.I. y fecha.
3. Añada índice automático con Referencias -> Tabla de contenido.
4. Copie en secciones el propósito, análisis, arquitectura, modelo de datos y explicación técnica.
5. Inserte las capturas una por una con Insertar -> Imágenes.
6. Redimensione a ancho máximo sin recortar texto, añada pie de figura y fecha.
7. Copie la matriz de pruebas y marque únicamente resultados ejecutados.
8. Añada el listado de archivos entregados y enlace GitHub.
9. Incluya registro de uso de IA y respuestas teóricas.
10. Revise ortografía y exporte como PDF: Archivo -> Guardar como -> PDF.
11. Compruebe que el PDF abre y que ninguna captura quedó cortada.
12. Cargue el PDF en Moodle y entregue el ZIP con el proyecto.

## 13. Instrucciones reproducibles

1. Instalar Node.js 20+ y PostgreSQL.
2. Crear la base `labcare`.
3. Ejecutar [schema.sql](LabCare/database/schema.sql).
4. Copiar `LabCare/.env.example` a `LabCare/.env`.
5. Configurar `DATABASE_URL`.
6. Ejecutar `npm install`, `npm start` y abrir `http://127.0.0.1:3001`.

Detalles completos en [LabCare/README.md](LabCare/README.md).

## 14. Git

Comandos sugeridos:

```bash
git switch -c examen/apellido-nombre
git add LabCare documentacion.md
git commit -m "feat: agrega modulo LabCare de solicitudes"
git status
git log --oneline --decorate
```

Debe verificar que no se agregaron `.env`, `node_modules`, respaldos de base o archivos temporales.

## 15. Respuestas teóricas

### 1. Modelo, Vista y Controlador

El Modelo representa datos y acceso a PostgreSQL. La Vista presenta la interfaz. El Controlador recibe acciones HTTP, aplica coordinación y respuestas. En este proyecto las reglas críticas se validan en el backend/controlador y utilidades; el servidor es la autoridad porque el cliente puede ser modificado.

### 2. Diferencia POST, PUT y PATCH

- POST registra una solicitud nueva: `POST /api/solicitudes`.
- PUT reemplaza/actualiza los datos descriptivos seleccionados: `PUT /api/solicitudes/:id`.
- PATCH cambia parcialmente un recurso; aquí cambia estado: `PATCH /api/solicitudes/:id/estado`.

### 3. Frontend vs backend

El frontend mejora la experiencia, pero no protege al servidor si una solicitud se envía desde Postman, curl o código alterado. Ejemplo: el backend rechaza solicitantes menores de 3 aunque el HTML esté alterado.

### 4. Prueba negativa

Es una prueba que espera rechazo ante datos o acciones inválidas. Ejemplo: intentar cambiar una solicitud RESUELTA a PENDIENTE; el servidor debe responder 409 y conservar RESUELTA.

### 5. Uso responsable de IA

Significa usar IA como apoyo, revisar sugerencias, ejecutarlas y comprenderlas. Aquí se verificó el código con pruebas Node, comprobaciones de sintaxis y ejecución HTTP, además de revisar parámetros SQL y reglas de transición.

## 16. Registro de uso de IA

| Herramienta y prompt resumido | Sugerencia recibida | Qué se verificó / decisión |
|---|---|---|
| Copilot SDK - “implementa el examen LabCare como proyecto independiente” | Arquitectura Express/MVC, SQL PostgreSQL, validaciones, frontend y pruebas | Se revisó el código, se corrigió un tipo SQL, se ejecutaron `npm test` y `npm run check`, se inició el servidor y se verificó HTTP |
| Copilot SDK - “documenta pasos y evidencias para Word” | Estructura de documentación, matriz, capturas y exportación PDF | Se verificó que el documento distingue pruebas ejecutadas de pendientes y no marca CP sin evidencia |

## 17. Entregables finales

- proyecto fuente completo;
- script SQL;
- `ANALISIS.md`;
- `README.md`;
- matriz y evidencia;
- historial Git;
- PDF con capturas;
- registro de IA;
- enlace GitHub si se publica.