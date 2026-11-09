const Usuario = require('../models/usuarioModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const branchId = request.query.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  const includeInactive = request.query.inactivas === 'true';
  response.json({ data: await Usuario.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    includeInactive
  }) });
}

async function get(request, response, next) {
  const user = await Usuario.findById(Number(request.params.id));
  if (!user) return next(httpError(404, 'USER_NOT_FOUND', 'No se encontró el usuario solicitado.'));
  return response.json({ data: user });
}

async function create(request, response) {
  const user = await Usuario.create(request.validatedBody);
  response.status(201).json({ data: user });
}

async function update(request, response, next) {
  const user = await Usuario.update(Number(request.params.id), request.validatedBody);
  if (!user) return next(httpError(404, 'USER_NOT_FOUND', 'No se encontró un usuario activo con ese identificador.'));
  return response.json({ data: user });
}

async function deactivate(request, response, next) {
  const user = await Usuario.deactivate(Number(request.params.id));
  if (!user) return next(httpError(404, 'USER_NOT_FOUND', 'No se encontró un usuario activo con ese identificador.'));
  return response.json({ data: user, message: 'Usuario desactivado.' });
}

module.exports = { list, get, create, update, deactivate };
