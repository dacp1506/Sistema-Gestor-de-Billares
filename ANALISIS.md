# Análisis del examen integrador — Módulo de mantenimiento Bola8

## 1. Adaptación del caso

El caso original del examen (LabCare) gestiona solicitudes de mantenimiento de equipos de laboratorio. Para este examen se adapta al dominio del sistema semestral **Bola8**, un salón de billar multi-sucursal:

| Caso LabCare | Adaptación Bola8 |
|---|---|
| Personal de laboratorio | Personal del salón: administrador de sucursal, cajero u operador |
| Equipos de laboratorio | Equipos del salón: mesas, bolas, tacos, iluminación |
| Laboratorio / aula | Sucursal y ubicación dentro del salón |
| Solicitud de mantenimiento | Reporte de falla o mantenimiento de un equipo |
| Catálogo consultado desde BD | Tabla `equipos`, filtrada por sucursal y estado `OPERATIVO` |

El módulo se integra al backend MVC/API y al cliente Expo existentes. No se presenta el proyecto semestral completo como solución del examen: lo nuevo es la funcionalidad vertical de solicitudes de mantenimiento.

## 2. Actor y alcance

**Actor principal:** personal del salón de billar (administrador general, administrador de sucursal o cajero autenticado).

**Alcance implementado:**

- catálogo de equipos operativos por sucursal;
- registro, listado, búsqueda, filtrado, detalle, edición, cambio de estado y eliminación lógica de solicitudes;
- persistencia en PostgreSQL;
- mensajes de éxito, validación y error;
- pruebas automatizadas de reglas y controladores.

**Fuera de alcance:** alta/edición del catálogo de equipos, adjuntar fotos, notificaciones, costos de reparación e integración con proveedores.

## 3. Requerimientos funcionales

| ID | Requerimiento | Implementación |
|---|---|---|
| RF-01 | Listar solicitudes activas con código, equipo, solicitante, prioridad, estado y fecha. | `GET /api/solicitudes` + `MaintenanceScreen` |
| RF-02 | Registrar una solicitud con un equipo existente, solicitante, descripción y prioridad. | `POST /api/solicitudes` + modal de alta |
| RF-03 | Consultar una solicitud por identificador con todos sus datos. | `GET /api/solicitudes/:id` + modal de detalle |
| RF-04 | Editar los datos descriptivos sin alterar código, estado ni fecha original. | `PUT /api/solicitudes/:id` |
| RF-05 | Cambiar el estado respetando el flujo permitido. | `PATCH /api/solicitudes/:id/estado` |
| RF-06 | Eliminar lógicamente: sale del listado, permanece en la BD. | `DELETE /api/solicitudes/:id` (`activo=false`) |
| RF-07 | Buscar por código, solicitante o nombre/código de equipo. | Parámetro `q` con `ILIKE` |
| RF-08 | Filtrar por prioridad y estado. | Parámetros `prioridad` y `estado` |
| RF-09 | Mostrar mensajes claros de éxito, validación y error. | Avisos y diálogos de la pantalla |
| RF-10 | Mantener los datos al recargar o cerrar la aplicación. | PostgreSQL + consultas del cliente |

## 4. Reglas de negocio

1. El equipo debe existir en la tabla `equipos`, pertenecer a la sucursal y estar en estado `OPERATIVO`.
2. El solicitante es obligatorio, mínimo 3 caracteres después de eliminar espacios externos y máximo 120.
3. La descripción es obligatoria, mínimo 10 caracteres después de eliminar espacios externos y máximo 2000.
4. La prioridad solo admite `BAJA`, `MEDIA` o `ALTA`; se normaliza a mayúsculas.
5. Toda solicitud nueva inicia en `PENDIENTE`, sin importar lo que envíe el cliente.
6. El código se genera automáticamente con formato `SOL-AAAAMMDD-XXX` y es único.
7. Transiciones permitidas:
   - `PENDIENTE → EN_PROCESO` o `CANCELADA`;
   - `EN_PROCESO → RESUELTA` o `CANCELADA`;
   - `RESUELTA` y `CANCELADA` son finales.
8. La edición solo cambia equipo, solicitante, descripción y prioridad; conserva `id_solicitud`, `codigo_solicitud`, `estado`, `fecha_registro` y `activo`.
9. La eliminación es lógica: `activo=false`; el registro permanece en la base.
10. Un usuario de sucursal solo opera sobre su sucursal. Los cajeros pueden registrar y consultar; editar, cambiar estado y eliminar requieren rol administrador.

## 5. Diagrama UML simplificado de casos de uso

```text
                     +--------------------------------------+
                     |   Personal del salón de billar       |
                     | (admin general / admin sucursal /    |
                     |  cajero autenticado)                 |
                     +------------------+-------------------+
                                        |
        +-------------------------------+-------------------------------+
        |               |               |               |               |
        v               v               v               v               v
 +--------------+ +--------------+ +--------------+ +--------------+ +----------------+
 | Registrar    | | Listar y     | | Consultar    | | Editar       | | Cambiar estado |
 | solicitud    | | buscar/filtrar| | detalle      | | solicitud    | | (flujo válido) |
 +--------------+ +--------------+ +--------------+ +--------------+ +----------------+
                                                                              |
                                                                              v
                                                                     +----------------+
                                                                     | Eliminar       |
                                                                     | lógicamente    |
                                                                     +----------------+
```

Todas las acciones pasan por la autenticación JWT y el control de sucursal. La validación de reglas ocurre en el backend; la interfaz repite comprobaciones para mejorar la experiencia.

## 6. Esquema de arquitectura MVC / C4 (contenedores)

```text
+------------------------------+        HTTPS/JSON        +------------------------------+
| Cliente Expo (React Native)  | -----------------------> | API Express (Node.js 20)     |
| MaintenanceScreen            |                          | - solicitudRoutes             |
| services/maintenance.ts      |                          | - solicitudController         |
| MaintenanceFormModal         |                          | - domain/solicitud.js         |
+------------------------------+                          | - middlewares/validate.js     |
                                                          | - middlewares/auth.js         |
                                                          +--------------+---------------+
                                                                         |
                                                                         | consultas
                                                                         | parametrizadas
                                                                         v
                                                          +------------------------------+
                                                          | PostgreSQL                   |
                                                          | equipos                      |
                                                          | solicitudes_mantenimiento    |
                                                          +------------------------------+

Validaciones:
- Interfaz: obligatoriedad y longitudes antes de enviar (experiencia).
- API: validateSolicitudCreate / Update / Status, autorización y reglas de sucursal.
- Dominio: canTransition() para el flujo de estados.
- Base de datos: NOT NULL, UNIQUE, FOREIGN KEY y CHECK como última barrera.
```

## 7. Estructura de archivos del módulo

```text
backend/
  database/migrations/add_mantenimiento_module.sql
  src/domain/solicitud.js
  src/models/equipoModel.js
  src/models/solicitudModel.js
  src/controllers/equipoController.js
  src/controllers/solicitudController.js
  src/routes/equipoRoutes.js
  src/routes/solicitudRoutes.js
  tests/solicitud.test.js
  tests/solicitud-controller.test.js
frontend/
  src/services/maintenance.ts
  src/components/MaintenanceFormModal.tsx
  src/screens/MaintenanceScreen.tsx
```

## 8. Decisión técnica sobre la generación del código

El código `SOL-AAAAMMDD-XXX` se genera dentro de la misma transacción que inserta la solicitud. Antes de calcular el correlativo se toma un bloqueo de asesoría (`pg_advisory_xact_lock`) y se consulta el último código del día. Así, dos registros simultáneos no obtienen el mismo consecutivo. La restricción `UNIQUE` de `codigo_solicitud` actúa como respaldo.
