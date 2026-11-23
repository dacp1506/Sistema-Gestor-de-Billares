const equiposModel = require('../models/equiposModel');

async function list(request, response, next) {
  try {
    const equipos = await equiposModel.listAvailable();
    response.json({ data: equipos });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };

