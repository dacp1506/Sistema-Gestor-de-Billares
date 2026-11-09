const { issueToken, hashPassword } = require('../config/auth');
const Usuario = require('../models/usuarioModel');
const { httpError } = require('../middlewares/validate');

async function login(request, response, next) {
  const { email, password } = request.validatedBody;

  const user = await Usuario.findByEmail(email);
  if (!user || user.password_hash !== hashPassword(password) || !user.activo) {
    return next(httpError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas o usuario inactivo.'));
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
