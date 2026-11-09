const Sucursal = require('../models/sucursalModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const includeInactive = request.query.inactivas === 'true';
  response.json({ data: await Sucursal.findAll({ includeInactive }) });
}

async function get(request, response, next) {
  const branch = await Sucursal.findById(Number(request.params.id));
  if (!branch) return next(httpError(404, 'BRANCH_NOT_FOUND', 'No se encontró la sucursal solicitada.'));
  return response.json({ data: branch });
}

async function create(request, response) {
  const branch = await Sucursal.create(request.validatedBody);
  response.status(201).json({ data: branch });
}

async function update(request, response, next) {
  const branch = await Sucursal.update(Number(request.params.id), request.validatedBody);
  if (!branch) return next(httpError(404, 'BRANCH_NOT_FOUND', 'No se encontró una sucursal activa con ese identificador.'));
  return response.json({ data: branch });
}

async function deactivate(request, response, next) {
  const branch = await Sucursal.deactivate(Number(request.params.id));
  if (!branch) return next(httpError(404, 'BRANCH_NOT_FOUND', 'No se encontró una sucursal activa con ese identificador.'));
  return response.json({ data: branch, message: 'Sucursal desactivada.' });
}

module.exports = { list, get, create, update, deactivate };
