const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA'];
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA'];

// Flujo permitido por el examen: los estados finales no vuelven atrás.
const TRANSICIONES = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['RESUELTA', 'CANCELADA'],
  RESUELTA: [],
  CANCELADA: []
};

const ESTADO_INICIAL = 'PENDIENTE';

function nextStates(current) {
  return [...(TRANSICIONES[current] || [])];
}

function canTransition(current, next) {
  return ESTADOS.includes(next) && nextStates(current).includes(next);
}

module.exports = {
  PRIORIDADES,
  ESTADOS,
  TRANSICIONES,
  ESTADO_INICIAL,
  nextStates,
  canTransition
};
