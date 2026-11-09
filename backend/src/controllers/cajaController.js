const Caja = require('../models/cajaModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }

  const userId = request.user.rol === 'cajero'
    ? request.user.sub
    : request.query.id_usuario;
  if (userId && !/^[1-9]\d*$/.test(String(userId))) {
    throw httpError(400, 'INVALID_USER_ID', 'id_usuario debe ser un entero positivo.');
  }

  response.json({ data: await Caja.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    userId: userId ? Number(userId) : undefined,
  }) });
}

async function open(request, response) {
  const input = {
    ...request.validatedBody,
    id_sucursal: request.user.rol === 'admin_general'
      ? request.validatedBody.id_sucursal
      : Number(request.user.id_sucursal),
    id_usuario: Number(request.user.sub),
  };
  const shift = await Caja.open(input);
  response.status(201).json({ data: shift });
}

async function close(request, response, next) {
  const shift = await Caja.close(Number(request.params.id), request.validatedBody);
  if (!shift) return next(httpError(404, 'SHIFT_NOT_FOUND', 'No se encontró un turno abierto con ese identificador.'));
  return response.json({ data: shift });
}

module.exports = { list, open, close };
