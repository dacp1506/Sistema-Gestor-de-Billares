const Venta = require('../models/ventaModel');

async function create(request, response) {
  const sale = await Venta.create(request.validatedBody);
  response.status(201).json({ data: sale });
}

async function list(request, response) {
  const branchId = request.query.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  const requestedLimit = request.query.limit;
  if (requestedLimit && (!/^[1-9]\d*$/.test(String(requestedLimit)) || Number(requestedLimit) > 100)) {
    throw httpError(400, 'INVALID_LIMIT', 'limit debe ser un entero entre 1 y 100.');
  }
  response.json({ data: await Venta.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    limit: requestedLimit ? Number(requestedLimit) : 50
  }) });
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

module.exports = { create, list };
