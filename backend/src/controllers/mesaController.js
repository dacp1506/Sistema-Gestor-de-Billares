const Mesa = require('../models/mesaModel');
const { httpError } = require('../middlewares/validate');

async function listByBranch(request, response) {
  const branchId = request.params.id_sucursal || request.query.id_sucursal;
  if (!branchId || !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'BRANCH_REQUIRED', 'Indica una sucursal con /api/mesas/sucursal/:id_sucursal o ?id_sucursal=.');
  }
  response.json({ data: await Mesa.findByBranch(Number(branchId)) });
}

async function get(request, response, next) {
  const table = await Mesa.findById(Number(request.params.id));
  if (!table) return next(httpError(404, 'TABLE_NOT_FOUND', 'No se encontró la mesa solicitada.'));
  return response.json({ data: table });
}

async function create(request, response) {
  if (!request.validatedBody.id_sucursal) {
    throw httpError(400, 'BRANCH_REQUIRED', 'id_sucursal es obligatorio al registrar una mesa.');
  }
  const table = await Mesa.create(request.validatedBody);
  response.status(201).json({ data: table });
}

async function update(request, response, next) {
  const table = await Mesa.update(Number(request.params.id), request.validatedBody);
  if (!table) return next(httpError(404, 'TABLE_NOT_FOUND', 'No se encontró una mesa activa con ese identificador.'));
  return response.json({ data: table });
}

async function deactivate(request, response, next) {
  const table = await Mesa.deactivate(Number(request.params.id));
  if (table === 'active_session') {
    return next(httpError(409, 'TABLE_SESSION_ACTIVE', 'No se puede desactivar una mesa con una sesión activa o pausada.'));
  }
  if (!table) return next(httpError(404, 'TABLE_NOT_FOUND', 'No se encontró una mesa activa con ese identificador.'));
  return response.json({ data: table, message: 'Mesa desactivada.' });
}

module.exports = { listByBranch, get, create, update, deactivate };
