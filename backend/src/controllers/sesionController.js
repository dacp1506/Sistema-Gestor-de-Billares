const Sesion = require('../models/sesionModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  response.json({ data: await Sesion.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    activeOnly: request.query.activas === 'true'
  }) });
}

async function listActive(request, response) {
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  response.json({ data: await Sesion.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    activeOnly: true
  }) });
}

async function get(request, response, next) {
  const session = await Sesion.findById(Number(request.params.id));
  if (!session) return next(httpError(404, 'SESSION_NOT_FOUND', 'No se encontró la sesión solicitada.'));
  return response.json({ data: session });
}

async function start(request, response) {
  const input = {
    ...request.body,
    id_usuario: Number(request.user.sub),
  };
  response.status(201).json({ data: await Sesion.start(input) });
}

async function pause(request, response) {
  response.json({ data: await Sesion.pause(Number(request.params.id)) });
}

async function resume(request, response) {
  response.json({ data: await Sesion.resume(Number(request.params.id)) });
}

async function finish(request, response) {
  response.json({ data: await Sesion.finish(Number(request.params.id)) });
}

module.exports = { list, listActive, get, start, pause, resume, finish };
