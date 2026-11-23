const solicitudesModel = require('../models/solicitudesModel');
const equiposModel = require('../models/equiposModel');
const { validateCreate, validateUpdate, canTransition, ESTADOS, PRIORIDADES } = require('../utils');

function apiError(response, status, code, message, details) {
  return response.status(status).json({
    error: { code, message, ...(details ? { details } : {}) }
  });
}

async function list(request, response, next) {
  try {
    const prioridad = String(request.query.prioridad || '').toUpperCase();
    const estado = String(request.query.estado || '').toUpperCase();
    if (prioridad && !PRIORIDADES.has(prioridad)) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'La prioridad seleccionada no es valida.');
    }
    if (estado && !ESTADOS.has(estado)) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'El estado seleccionado no es valido.');
    }
    const solicitudes = await solicitudesModel.list({
      q: String(request.query.q || ''),
      prioridad,
      estado
    });
    return response.json({ data: solicitudes });
  } catch (error) {
    return next(error);
  }
}

async function detail(request, response, next) {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return apiError(response, 404, 'NOT_FOUND', 'La solicitud no existe.');
    }
    const solicitud = await solicitudesModel.findActiveById(id);
    if (!solicitud) return apiError(response, 404, 'NOT_FOUND', 'La solicitud no existe.');
    return response.json({ data: solicitud });
  } catch (error) {
    return next(error);
  }
}

async function create(request, response, next) {
  try {
    const validation = validateCreate(request.body);
    if (!validation.valid) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'Corrija los datos indicados.', validation.errors);
    }
    const equipo = await equiposModel.findAvailableById(validation.value.equipo_id);
    if (!equipo) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'El equipo seleccionado no existe o no esta disponible.');
    }
    const solicitud = await solicitudesModel.create(validation.value);
    return response.status(201).json({ message: 'Solicitud registrada correctamente.', data: solicitud });
  } catch (error) {
    return next(error);
  }
}

async function update(request, response, next) {
  try {
    const id = Number(request.params.id);
    const existing = await solicitudesModel.findSystemFieldsById(id);
    if (!existing || !existing.activo) {
      return apiError(response, 404, 'NOT_FOUND', 'La solicitud no existe.');
    }
    const validation = validateUpdate(request.body);
    if (!validation.valid) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'Corrija los datos indicados.', validation.errors);
    }
    const equipo = await equiposModel.findAvailableById(validation.value.equipo_id);
    if (!equipo) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'El equipo seleccionado no existe o no esta disponible.');
    }
    await solicitudesModel.update(id, validation.value);
    const solicitud = await solicitudesModel.findActiveById(id);
    return response.json({ message: 'Solicitud actualizada correctamente.', data: solicitud });
  } catch (error) {
    return next(error);
  }
}

async function changeState(request, response, next) {
  try {
    const id = Number(request.params.id);
    const nextState = String(request.body?.estado || '').trim().toUpperCase();
    const existing = await solicitudesModel.findSystemFieldsById(id);
    if (!existing || !existing.activo) {
      return apiError(response, 404, 'NOT_FOUND', 'La solicitud no existe.');
    }
    if (!ESTADOS.has(nextState)) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'El estado indicado no es valido.');
    }
    if (!canTransition(existing.estado, nextState)) {
      return apiError(response, 409, 'STATE_TRANSITION_NOT_ALLOWED',
        `No se puede cambiar ${existing.estado} a ${nextState}.`);
    }
    const updated = await solicitudesModel.changeState(id, nextState);
    const solicitud = await solicitudesModel.findActiveById(updated.id);
    return response.json({ message: `Solicitud cambiada a ${nextState}.`, data: solicitud });
  } catch (error) {
    return next(error);
  }
}

async function logicalDelete(request, response, next) {
  try {
    const id = Number(request.params.id);
    const deleted = await solicitudesModel.logicalDelete(id);
    if (!deleted) return apiError(response, 404, 'NOT_FOUND', 'La solicitud no existe o ya fue eliminada.');
    return response.json({ message: 'Solicitud eliminada logicamente.', data: { id: deleted.id, activo: false } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, detail, create, update, changeState, logicalDelete };

