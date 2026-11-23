# Analisis del examen LabCare

## Actor y alcance

El actor principal es el **Personal de laboratorio**. Usa el sistema para registrar fallas de equipos y dar seguimiento a las solicitudes hasta resolución o cancelación. Quedan fuera la gestión de usuarios, inventario general de activos y mantenimiento físico.

## Requerimientos implementados

1. Listar solicitudes activas con código, equipo, solicitante, prioridad, estado y fecha.
2. Registrar solicitudes seleccionando equipos existentes.
3. Consultar el detalle completo por identificador.
4. Editar datos descriptivos sin modificar código, estado ni fecha original.
5. Cambiar estado siguiendo las transiciones autorizadas.
6. Eliminar solicitudes de forma lógica.
7. Buscar por código, solicitante o nombre del equipo.
8. Filtrar por prioridad y estado.
9. Mostrar mensajes claros de éxito y error.
10. Persistir datos en PostgreSQL.

## Reglas de negocio

- Solo equipos con estado OPERATIVO pueden seleccionarse.
- Solicitante obligatorio de al menos 3 caracteres.
- Descripción obligatoria de al menos 10 caracteres.
- Prioridad: BAJA, MEDIA o ALTA.
- Nueva solicitud: PENDIENTE.
- PENDIENTE -> EN_PROCESO o CANCELADA.
- EN_PROCESO -> RESUELTA o CANCELADA.
- RESUELTA y CANCELADA son finales.
- Eliminación lógica: activo=false.

## UML simplificado

```text
Personal de laboratorio
  |-- Registrar solicitud
  |-- Listar solicitudes
  |-- Buscar y filtrar
  |-- Consultar detalle
  |-- Editar solicitud
  |-- Cambiar estado
  `-- Eliminar lógicamente

Registrar/Listar/Editar/Cambiar/Eliminar -> Backend API -> PostgreSQL
```

## Arquitectura MVC/API

```text
[Interfaz web]
  public/index.html + app.js
        |
        | fetch /api
        v
[Rutas Express]
        |
        v
[Controladores]
  validan reglas de flujo y respuestas
        |
        v
[Modelos]
  consultas parametrizadas con pg
        |
        v
[PostgreSQL]
  equipos + solicitudes
```

Las validaciones básicas de experiencia existen en el formulario y todas las reglas obligatorias se vuelven a validar en controladores y utilidades del backend. Las restricciones finales también están declaradas en SQL.

