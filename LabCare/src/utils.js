const PRIORIDADES = new Set(['BAJA', 'MEDIA', 'ALTA']);
const ESTADOS = new Set(['PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA']);
const TRANSITIONS = {
  PENDIENTE: new Set(['EN_PROCESO', 'CANCELADA']),
  EN_PROCESO: new Set(['RESUELTA', 'CANCELADA']),
  RESUELTA: new Set(),
  CANCELADA: new Set()
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCreate(body) {
  const solicitante = clean(body?.solicitante);
  const descripcion = clean(body?.descripcion);
  const prioridad = clean(body?.prioridad).toUpperCase();
  const equipo_id = Number(body?.equipo_id);
  const errors = {};

  if (!Number.isInteger(equipo_id) || equipo_id <= 0) errors.equipo_id = 'Seleccione un equipo valido.';
  if (solicitante.length < 3) errors.solicitante = 'El solicitante es obligatorio y debe tener al menos 3 caracteres.';
  if (descripcion.length < 10) errors.descripcion = 'La descripcion es obligatoria y debe tener al menos 10 caracteres.';
  if (!PRIORIDADES.has(prioridad)) errors.prioridad = 'La prioridad debe ser BAJA, MEDIA o ALTA.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { equipo_id, solicitante, descripcion, prioridad }
  };
}

function validateUpdate(body) {
  const solicitante = clean(body?.solicitante);
  const descripcion = clean(body?.descripcion);
  const prioridad = clean(body?.prioridad).toUpperCase();
  const equipo_id = Number(body?.equipo_id);
  const errors = {};

  if (!Number.isInteger(equipo_id) || equipo_id <= 0) errors.equipo_id = 'Seleccione un equipo valido.';
  if (solicitante.length < 3) errors.solicitante = 'El solicitante es obligatorio y debe tener al menos 3 caracteres.';
  if (descripcion.length < 10) errors.descripcion = 'La descripcion es obligatoria y debe tener al menos 10 caracteres.';
  if (!PRIORIDADES.has(prioridad)) errors.prioridad = 'La prioridad debe ser BAJA, MEDIA o ALTA.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { equipo_id, solicitante, descripcion, prioridad }
  };
}

function canTransition(current, next) {
  return ESTADOS.has(next) && Boolean(TRANSITIONS[current]?.has(next));
}

module.exports = { PRIORIDADES, ESTADOS, clean, validateCreate, validateUpdate, canTransition };

