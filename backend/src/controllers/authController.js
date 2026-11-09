const { issueToken, hashPassword, verifyPassword } = require('../config/auth');
const Usuario = require('../models/usuarioModel');
const { httpError } = require('../middlewares/validate');

async function login(request, response, next) {
  const { email, password } = request.validatedBody;

  const user = await Usuario.findByEmail(email);
  if (!user || !user.activo) {
    return next(httpError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas o usuario inactivo.'));
  }

  const passwordCheck = await verifyPassword(password, user.password_hash);
  if (!passwordCheck.valid) {
    return next(httpError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas o usuario inactivo.'));
  }

  if (passwordCheck.needsRehash) {
    const replacementHash = await hashPassword(password);
    const upgraded = await Usuario.upgradePasswordHash(
      user.id_usuario,
      user.password_hash,
      replacementHash,
    );
    if (!upgraded) {
      return next(httpError(401, 'INVALID_CREDENTIALS', 'Las credenciales cambiaron. Inicia sesión nuevamente.'));
    }
  }

  const token = issueToken({
    sub: user.id_usuario,
    email: user.email,
    rol: user.rol,
    id_sucursal: user.id_sucursal,
  });

  return response.json({
    token,
    user: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      id_sucursal: user.id_sucursal,
      activo: user.activo,
    }
  });
}

module.exports = { login };
