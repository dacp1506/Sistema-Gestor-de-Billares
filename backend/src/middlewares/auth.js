const { verifyToken } = require('../config/auth');
const { httpError } = require('./validate');
const { pool } = require('../config/db');

const resourceBranchQueries = {
  sucursal: 'SELECT id_sucursal FROM sucursales WHERE id_sucursal = $1',
  producto: 'SELECT id_sucursal FROM productos WHERE id_producto = $1',
  mesa: 'SELECT id_sucursal FROM mesas WHERE id_mesa = $1',
  sesion: `SELECT m.id_sucursal FROM sesiones_mesa s
           JOIN mesas m ON m.id_mesa = s.id_mesa WHERE s.id_sesion = $1`,
  reserva: `SELECT m.id_sucursal FROM reservas r
            JOIN mesas m ON m.id_mesa = r.id_mesa WHERE r.id_reserva = $1`,
  caja: 'SELECT id_sucursal, id_usuario FROM caja_turnos WHERE id_caja = $1',
  venta: 'SELECT id_sucursal FROM ventas WHERE id_venta = $1',
};

function requireAuth(request, response, next) {
  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(httpError(401, 'AUTH_REQUIRED', 'Se requiere un token de autenticación.'));
  }

  try {
    const decoded = verifyToken(token);
    request.user = decoded;
    return next();
  } catch (error) {
    return next(httpError(401, 'INVALID_TOKEN', 'Token inválido o expirado.'));
  }
}

function requireRole(...roles) {
  return function authorize(request, response, next) {
    if (!request.user || !roles.includes(request.user.rol)) {
      return next(httpError(403, 'FORBIDDEN', 'No tienes permisos para esta operación.'));
    }
    return next();
  };
}

function requireBranchAccess(request, response, next) {
  if (request.user?.rol === 'admin_general') return next();

  const requestedBranch = request.params.id_sucursal
    ?? request.query.id_sucursal
    ?? request.body?.id_sucursal;

  if (requestedBranch != null &&
      String(requestedBranch) !== String(request.user?.id_sucursal)) {
    return next(httpError(403, 'BRANCH_FORBIDDEN', 'No tienes acceso a esta sucursal.'));
  }
  return next();
}

function requireResourceBranch(resource, idParam = 'id') {
  const query = resourceBranchQueries[resource];
  if (!query) throw new Error(`Unknown branch-scoped resource: ${resource}`);

  return async function authorizeResource(request, response, next) {
    if (request.user?.rol === 'admin_general') return next();

    const resourceId = request.params[idParam];
    if (!resourceId || !/^[1-9]\d*$/.test(resourceId)) return next();

    const { rows } = await pool.query(query, [resourceId]);
    if (rows[0]) {
      if (String(rows[0].id_sucursal) !== String(request.user?.id_sucursal)) {
        return next(httpError(403, 'BRANCH_FORBIDDEN', 'No tienes acceso a esta sucursal.'));
      }
      if (resource === 'caja' && request.user?.rol === 'cajero' &&
          String(rows[0].id_usuario) !== String(request.user?.sub)) {
        return next(httpError(403, 'SHIFT_FORBIDDEN', 'Solo puedes cerrar tus propios turnos de caja.'));
      }
    }
    return next();
  };
}

async function requireTableBranchFromBody(request, response, next) {
  if (request.user?.rol === 'admin_general') return next();

  const tableId = request.body?.id_mesa;
  if (!Number.isSafeInteger(Number(tableId)) || Number(tableId) <= 0) return next();

  const { rows } = await pool.query(
    'SELECT id_sucursal FROM mesas WHERE id_mesa = $1',
    [tableId],
  );
  if (rows[0] && String(rows[0].id_sucursal) !== String(request.user?.id_sucursal)) {
    return next(httpError(403, 'BRANCH_FORBIDDEN', 'No tienes acceso a esta sucursal.'));
  }
  return next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireBranchAccess,
  requireResourceBranch,
  requireTableBranchFromBody,
};
