const Configuracion = require('../models/configuracionModel');

async function get(request, response) {
  const userId = Number(request.user.sub);
  const saved = await Configuracion.findByUser(userId);
  response.json({
    data: saved
      ? { ...Configuracion.DEFAULT_SETTINGS, ...saved }
      : { ...Configuracion.DEFAULT_SETTINGS },
  });
}

async function update(request, response) {
  const userId = Number(request.user.sub);
  const saved = await Configuracion.upsert(userId, request.validatedBody);
  response.json({ data: saved, message: 'Configuración guardada correctamente.' });
}

module.exports = { get, update };
