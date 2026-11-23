# LabCare - Solicitudes de mantenimiento

Solución web independiente para registrar y controlar solicitudes de mantenimiento de equipos de laboratorio.

## Tecnologías

- Node.js 20 y Express 5
- PostgreSQL 14 o posterior
- HTML, CSS y JavaScript
- Arquitectura MVC/API

## Requisitos

- Node.js 20 o posterior
- PostgreSQL accesible
- Navegador moderno

## Configuración

1. Cree una base de datos PostgreSQL llamada `labcare`.
2. Copie `.env.example` a `.env`.
3. Complete `DATABASE_URL` con su conexión local. Mantenga `DATABASE_SSL=false` para PostgreSQL local sin TLS.
4. Ejecute el script:
   ```bash
   psql -d labcare -f database/schema.sql
   ```
   También puede pegar el contenido de `database/schema.sql` en pgAdmin.
5. Instale dependencias:
   ```bash
   cd LabCare
   npm install
   ```
6. Inicie:
   ```bash
   npm start
   ```
7. Abra `http://127.0.0.1:3001`.

## Pruebas

```bash
npm test
npm run check
```

Las pruebas actuales verifican validaciones y transiciones sin requerir base de datos.

## API

- `GET /api/equipos` - equipos disponibles
- `GET /api/solicitudes?q=&prioridad=&estado=` - listado activo y filtros
- `POST /api/solicitudes` - crear
- `GET /api/solicitudes/:id` - detalle
- `PUT /api/solicitudes/:id` - editar datos descriptivos
- `PATCH /api/solicitudes/:id/estado` - cambiar estado
- `DELETE /api/solicitudes/:id` - eliminar lógicamente
- `GET /api/health` - estado de servidor y base de datos

## Seguridad y datos

Las consultas SQL utilizan parámetros de PostgreSQL. Las credenciales quedan fuera del repositorio en `.env`. Los mensajes HTTP no exponen trazas internas. Los datos son gestionados por PostgreSQL y permanecen al recargar o cerrar la aplicación.

