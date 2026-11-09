function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la solicitud no es JSON válido.' }
    });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud supera el límite permitido.' }
    });
  }

  const postgresErrors = {
    '3D000': { status: 503, code: 'DATABASE_NOT_FOUND', message: 'El nombre de la base indicado en DATABASE_URL no existe. Revisa el URI de conexión de Supabase.' },
    '23503': { status: 409, code: 'REFERENCE_CONFLICT', message: 'El registro está relacionado con otros datos y no puede eliminarse.' },
    '23505': { status: 409, code: 'DUPLICATE_RECORD', message: 'Ya existe un registro con esos datos en esta sucursal.' },
    '23514': { status: 400, code: 'CONSTRAINT_VIOLATION', message: 'Uno o más valores no cumplen las reglas del sistema.' },
    '22P02': { status: 400, code: 'INVALID_VALUE', message: 'Uno o más valores tienen un formato inválido.' }
  };
  if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) {
    console.error('No se pudo establecer conexión con PostgreSQL:', error.code);
    return response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'No se pudo conectar con la base de datos. Revisa la URL y disponibilidad del servicio.'
      }
    });
  }

  if (['SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(error.code)) {
    console.error('No se pudo validar el certificado TLS de PostgreSQL:', error.code);
    return response.status(503).json({
      error: {
        code: 'DATABASE_TLS_INVALID',
        message: 'No se pudo validar el certificado TLS de la base de datos. Revisa DATABASE_SSL_CA.'
      }
    });
  }

  const knownError = postgresErrors[error.code];

  if (knownError) {
    return response.status(knownError.status).json({ error: knownError });
  }

  if (error.status && error.code) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message }
    });
  }

  console.error('Error no controlado en la API:', error);
  return response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno. Inténtalo nuevamente.' }
  });
}

module.exports = errorHandler;
