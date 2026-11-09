const Reserva = require('../models/reservaModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  const date = request.query.fecha_reserva;
  const tableId = request.query.id_mesa;

  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  if (tableId && !/^[1-9]\d*$/.test(String(tableId))) {
    throw httpError(400, 'INVALID_TABLE_ID', 'id_mesa debe ser un entero positivo.');
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw httpError(400, 'INVALID_DATE', 'fecha_reserva debe tener formato YYYY-MM-DD.');
  }

  const reservations = await Reserva.findAll({
    branchId: branchId ? Number(branchId) : undefined,
    date: date || undefined,
    tableId: tableId ? Number(tableId) : undefined,
  });

  response.json({ data: reservations });
}

async function get(request, response, next) {
  const reservation = await Reserva.findById(Number(request.params.id));
  if (!reservation) {
    return next(httpError(404, 'RESERVATION_NOT_FOUND', 'No se encontró la reserva solicitada.'));
  }
  return response.json({ data: reservation });
}

async function create(request, response) {
  const reservation = await Reserva.create(request.validatedBody);
  response.status(201).json({ data: reservation });
}

async function updateStatus(request, response, next) {
  const reservation = await Reserva.updateStatus(Number(request.params.id), request.validatedBody);
  if (!reservation) {
    return next(httpError(404, 'RESERVATION_NOT_FOUND', 'No se encontró la reserva indicada.'));
  }
  return response.json({ data: reservation });
}

module.exports = { list, get, create, updateStatus };
