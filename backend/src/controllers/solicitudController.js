const Solicitud = require('../models/solicitudModel');
const Equipo = require('../models/equipoModel');
const { httpError } = require('../middlewares/validate');
const { PRIORIDADES, ESTADOS, canTransition } = require('../domain/solicitud');

function resolveBranchId(request) {
  if (request.user.rol !== 'admin_general') return Number(request.user.id_sucursal);
  const requested = request.body?.id_sucursal ?? request.query?.id_sucursal;
  if (requested == null || !/^[1-9]\d*$/.test(String(requested))) return null;
  return Number(requested);
}

function normalizeFilter(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

async function list(request, response) {
  const branchId = resolveBranchId(request);
  if (!branchId) {
    throw httpError(400, 'BRANCH_REQUIRED', 'Indica la sucursal con ?id_sucursal=.');
  }

  const prioridad = normalizeFilter(request.query.prioridad);
  const estado = normalizeFilter(request.query.estado);
  if (prioridad && !PRIORIDADES.includes(prioridad)) {
    throw httpError(400, 'VALIDATION_ERROR', 'La prioridad seleccionada no es válida.');
  }
  if (estado && !ESTADOS.includes(estado)) {
    throw httpError(400, 'VALIDATION_ERROR', 'El estado seleccionado no es válido.');
  }

  const data = await Solicitud.list({
    branchId,
    q: typeof request.query.q === 'string' ? request.query.q : '',
    prioridad,
    estado
  });
  response.json({ data });
}

async function get(request, response, next) {
  const solicitud = await Solicitud.findActiveById(Number(request.params.id));
  if (!solicitud) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o fue eliminada.'));
  }
  return response.json({ data: solicitud });
}

async function create(request, response) {
  const branchId = resolveBranchId(request);
  if (!branchId) {
    throw httpError(400, 'BRANCH_REQUIRED', 'id_sucursal es obligatorio al registrar una solicitud.');
  }

  const input = request.validatedBody;
  const equipo = await Equipo.findAvailableById(input.id_equipo, branchId);
  if (!equipo) {
    throw httpError(
      400,
      'EQUIPMENT_NOT_AVAILABLE',
      'El equipo seleccionado no existe o no está operativo en esta sucursal.'
    );
  }

  const solicitud = await Solicitud.create({ ...input, id_sucursal: branchId });
  response.status(201).json({
    data: solicitud,
    message: 'Solicitud de mantenimiento registrada correctamente.'
  });
}

async function update(request, response, next) {
  const id = Number(request.params.id);
  const existing = await Solicitud.findSystemFieldsById(id);
  if (!existing || !existing.activo) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o fue eliminada.'));
  }

  const input = request.validatedBody;
  const equipo = await Equipo.findAvailableById(input.id_equipo, existing.id_sucursal);
  if (!equipo) {
    return next(httpError(
      400,
      'EQUIPMENT_NOT_AVAILABLE',
      'El equipo seleccionado no existe o no está operativo en esta sucursal.'
    ));
  }

  const solicitud = await Solicitud.update(id, input);
  if (!solicitud) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o fue eliminada.'));
  }
  return response.json({ data: solicitud, message: 'Solicitud actualizada correctamente.' });
}

async function changeState(request, response, next) {
  const id = Number(request.params.id);
  const existing = await Solicitud.findSystemFieldsById(id);
  if (!existing || !existing.activo) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o fue eliminada.'));
  }

  const { estado } = request.validatedBody;
  if (!canTransition(existing.estado, estado)) {
    return next(httpError(
      409,
      'STATE_TRANSITION_NOT_ALLOWED',
      `No se puede cambiar la solicitud de ${existing.estado} a ${estado}.`
    ));
  }

  const solicitud = await Solicitud.changeState(id, estado);
  if (!solicitud) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o fue eliminada.'));
  }
  return response.json({ data: solicitud, message: `Solicitud cambiada a ${estado}.` });
}

async function logicalDelete(request, response, next) {
  const deleted = await Solicitud.logicalDelete(Number(request.params.id));
  if (!deleted) {
    return next(httpError(404, 'REQUEST_NOT_FOUND', 'La solicitud no existe o ya fue eliminada.'));
  }
  return response.json({
    data: { id_solicitud: deleted.id_solicitud, activo: false },
    message: 'Solicitud eliminada lógicamente. El histórico se conserva.'
  });
}

module.exports = { list, get, create, update, changeState, logicalDelete };
