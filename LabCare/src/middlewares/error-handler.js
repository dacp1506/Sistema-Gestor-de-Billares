function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);
  if (error?.code === '23505') {
    return response.status(409).json({
      error: { code: 'CONFLICT', message: 'Ya existe un registro con esos datos.' }
    });
  }
  if (error?.code === '23503') {
    return response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Una referencia seleccionada no existe.' }
    });
  }
  console.error(error);
  return response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'No fue posible completar la operacion.' }
  });
}

module.exports = errorHandler;

