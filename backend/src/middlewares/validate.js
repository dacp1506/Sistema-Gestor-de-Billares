const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function validateId(request, response, next) {
  if (!/^[1-9]\d*$/.test(request.params.id || '')) {
    return next(httpError(400, 'INVALID_ID', 'El identificador debe ser un entero positivo.'));
  }
  return next();
}

function validateBranch(request, response, next) {
  const { nombre, direccion, telefono } = request.body || {};
  const errors = [];
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 100) {
    errors.push('nombre es obligatorio y debe tener hasta 100 caracteres.');
  }
  if (direccion != null && (typeof direccion !== 'string' || direccion.length > 255)) {
    errors.push('direccion debe tener hasta 255 caracteres.');
  }
  if (telefono != null && (typeof telefono !== 'string' || telefono.length > 30)) {
    errors.push('telefono debe tener hasta 30 caracteres.');
  }
  if (typeof request.body?.estado !== 'undefined' && typeof request.body.estado !== 'boolean') {
    errors.push('estado debe ser verdadero o falso.');
  }
  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));
  request.validatedBody = {
    nombre: nombre.trim(),
    direccion: direccion?.trim() || null,
    telefono: telefono?.trim() || null,
    estado: request.body.estado
  };
  return next();
}

function validateTable(request, response, next) {
  const { numero_mesa, tipo_mesa, tarifa_minuto, id_sucursal, estado } = request.body || {};
  const errors = [];
  if (typeof numero_mesa !== 'string' || !numero_mesa.trim() || numero_mesa.trim().length > 20) {
    errors.push('numero_mesa es obligatorio y debe tener hasta 20 caracteres.');
  }
  if (typeof tipo_mesa !== 'string' || !tipo_mesa.trim() || tipo_mesa.trim().length > 50) {
    errors.push('tipo_mesa es obligatorio y debe tener hasta 50 caracteres.');
  }
  if (typeof tarifa_minuto !== 'number' || !Number.isFinite(tarifa_minuto) || tarifa_minuto <= 0) {
    errors.push('tarifa_minuto debe ser un número mayor que cero.');
  }
  if (id_sucursal != null && (!Number.isSafeInteger(Number(id_sucursal)) || Number(id_sucursal) <= 0)) {
    errors.push('id_sucursal debe ser un entero positivo.');
  }
  if (estado != null && !['libre', 'mantenimiento'].includes(estado)) {
    errors.push('estado solo puede ser libre o mantenimiento al crear o editar una mesa.');
  }
  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));
  request.validatedBody = {
    numero_mesa: numero_mesa.trim(),
    tipo_mesa: tipo_mesa.trim(),
    tarifa_minuto,
    id_sucursal: id_sucursal == null ? undefined : Number(id_sucursal),
    estado
  };
  return next();
}

function validateProduct(request, response, next) {
  const { nombre, precio_venta, stock, id_sucursal, categoria, stock_minimo } = request.body || {};
  const errors = [];
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120) {
    errors.push('nombre es obligatorio y debe tener hasta 120 caracteres.');
  }
  if (typeof precio_venta !== 'number' || !Number.isFinite(precio_venta) || precio_venta < 0) {
    errors.push('precio_venta debe ser un número igual o mayor a cero.');
  }
  if (!Number.isSafeInteger(stock) || stock < 0) {
    errors.push('stock debe ser un entero igual o mayor a cero.');
  }
  if (id_sucursal != null && (!Number.isSafeInteger(Number(id_sucursal)) || Number(id_sucursal) <= 0)) {
    errors.push('id_sucursal debe ser un entero positivo.');
  }
  if (categoria != null && (typeof categoria !== 'string' || categoria.length > 80)) {
    errors.push('categoria debe tener hasta 80 caracteres.');
  }
  if (stock_minimo != null && (!Number.isSafeInteger(stock_minimo) || stock_minimo < 0)) {
    errors.push('stock_minimo debe ser un entero igual o mayor a cero.');
  }
  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));
  request.validatedBody = {
    nombre: nombre.trim(),
    precio_venta,
    stock,
    id_sucursal: id_sucursal == null ? undefined : Number(id_sucursal),
    categoria: categoria?.trim() || null,
    stock_minimo: stock_minimo ?? 0
  };
  return next();
}

function validateSale(request, response, next) {
  const { id_sucursal, id_usuario, id_sesion, tipo_venta, items } = request.body || {};
  const errors = [];
  if (!Number.isSafeInteger(id_sucursal) || id_sucursal <= 0) errors.push('id_sucursal debe ser un entero positivo.');
  if (!Number.isSafeInteger(id_usuario) || id_usuario <= 0) errors.push('id_usuario debe ser un entero positivo.');
  if (id_sesion != null && (!Number.isSafeInteger(id_sesion) || id_sesion <= 0)) errors.push('id_sesion debe ser un entero positivo.');
  if (!['directa', 'mesa'].includes(tipo_venta)) errors.push('tipo_venta debe ser directa o mesa.');
  if ((tipo_venta === 'mesa') !== (id_sesion != null)) errors.push('Las ventas de mesa requieren id_sesion; las directas no deben incluirlo.');
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) errors.push('items debe contener entre 1 y 100 productos.');
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (!Number.isSafeInteger(item?.id_producto) || item.id_producto <= 0 || !Number.isSafeInteger(item?.cantidad) || item.cantidad <= 0) {
        errors.push(`items[${index}] requiere id_producto y cantidad como enteros positivos.`);
      }
    });
  }
  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));
  return next();
}

function validateStartSession(request, response, next) {
  const { id_mesa, id_usuario } = request.body || {};
  if (!Number.isSafeInteger(id_mesa) || id_mesa <= 0 ||
      !Number.isSafeInteger(id_usuario) || id_usuario <= 0) {
    return next(httpError(400, 'VALIDATION_ERROR', 'id_mesa e id_usuario deben ser enteros positivos.'));
  }
  return next();
}

function validateCashOpen(request, response, next) {
  const { id_sucursal, id_usuario, monto_inicial } = request.body || {};
  const errors = [];

  if (!Number.isSafeInteger(Number(id_sucursal)) || Number(id_sucursal) <= 0) {
    errors.push('id_sucursal debe ser un entero positivo.');
  }
  if (!Number.isSafeInteger(Number(id_usuario)) || Number(id_usuario) <= 0) {
    errors.push('id_usuario debe ser un entero positivo.');
  }
  if (typeof monto_inicial !== 'number' || !Number.isFinite(monto_inicial) || monto_inicial < 0) {
    errors.push('monto_inicial debe ser un número mayor o igual a cero.');
  }

  if (errors.length) {
    return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));
  }

  request.validatedBody = {
    id_sucursal: Number(id_sucursal),
    id_usuario: Number(id_usuario),
    monto_inicial: Number(monto_inicial)
  };
  return next();
}

function validateCashClose(request, response, next) {
  const { monto_declarado } = request.body || {};

  if (typeof monto_declarado !== 'number' || !Number.isFinite(monto_declarado) || monto_declarado < 0) {
    return next(httpError(400, 'VALIDATION_ERROR', 'monto_declarado debe ser un número mayor o igual a cero.'));
  }

  request.validatedBody = { monto_declarado: Number(monto_declarado) };
  return next();
}

function validateReservation(request, response, next) {
  const { nombre_cliente, telefono_cliente, fecha_reserva, hora_inicio, duracion_minutos, id_mesa, estado } = request.body || {};
  const errors = [];

  if (typeof nombre_cliente !== 'string' || !nombre_cliente.trim() || nombre_cliente.trim().length > 120) {
    errors.push('nombre_cliente es obligatorio y debe tener hasta 120 caracteres.');
  }
  if (typeof telefono_cliente !== 'string' || !telefono_cliente.trim() || telefono_cliente.trim().length > 30) {
    errors.push('telefono_cliente es obligatorio y debe tener hasta 30 caracteres.');
  }
  if (typeof fecha_reserva !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva)) {
    errors.push('fecha_reserva debe tener formato YYYY-MM-DD.');
  }
  if (typeof hora_inicio !== 'string' || !/^\d{2}:\d{2}$/.test(hora_inicio)) {
    errors.push('hora_inicio debe tener formato HH:MM.');
  }
  if (!Number.isSafeInteger(duracion_minutos) || duracion_minutos <= 0 || duracion_minutos > 720) {
    errors.push('duracion_minutos debe ser un entero entre 1 y 720.');
  }
  if (!Number.isSafeInteger(Number(id_mesa)) || Number(id_mesa) <= 0) {
    errors.push('id_mesa debe ser un entero positivo.');
  }
  if (estado != null && !['pendiente', 'confirmada', 'cancelada', 'atendida'].includes(estado)) {
    errors.push('estado debe ser pendiente, confirmada, cancelada o atendida.');
  }

  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));

  request.validatedBody = {
    nombre_cliente: nombre_cliente.trim(),
    telefono_cliente: telefono_cliente.trim(),
    fecha_reserva,
    hora_inicio,
    duracion_minutos: Number(duracion_minutos),
    id_mesa: Number(id_mesa),
    estado: estado || 'pendiente'
  };
  return next();
}

function validateReservationStatus(request, response, next) {
  const { estado } = request.body || {};
  if (!['pendiente', 'confirmada', 'cancelada', 'atendida'].includes(estado)) {
    return next(httpError(400, 'VALIDATION_ERROR', 'estado debe ser pendiente, confirmada, cancelada o atendida.'));
  }
  request.validatedBody = { estado };
  return next();
}

function validateLogin(request, response, next) {
  const { email, password } = request.body || {};
  const errors = [];

  if (typeof email !== 'string' || !email.trim() || !emailPattern.test(email.trim())) {
    errors.push('email debe ser un correo válido.');
  }

  if (typeof password !== 'string' || !password.trim() || password.trim().length < 6 || password.trim().length > 255) {
    errors.push('password debe tener entre 6 y 255 caracteres.');
  }

  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));

  request.validatedBody = {
    email: email.trim().toLowerCase(),
    password: password.trim()
  };
  return next();
}

function validateUser(request, response, next) {
  const { nombre, email, password, rol, id_sucursal, activo } = request.body || {};
  const errors = [];

  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120) {
    errors.push('nombre es obligatorio y debe tener hasta 120 caracteres.');
  }
  if (typeof email !== 'string' || !emailPattern.test(email.trim())) {
    errors.push('email debe ser un correo válido.');
  }

  if (request.method === 'POST') {
    if (typeof password !== 'string' || password.trim().length < 12 || password.trim().length > 255) {
      errors.push('password debe tener entre 12 y 255 caracteres.');
    }
  } else if (password != null && (typeof password !== 'string' || password.trim().length < 12 || password.trim().length > 255)) {
    errors.push('password debe tener entre 12 y 255 caracteres.');
  }

  if (!['admin_general', 'admin_sucursal', 'cajero'].includes(rol)) {
    errors.push('rol debe ser admin_general, admin_sucursal o cajero.');
  }

  if (rol === 'admin_general') {
    if (id_sucursal != null && id_sucursal !== '') {
      errors.push('admin_general no puede pertenecer a una sucursal.');
    }
  } else {
    if (!Number.isSafeInteger(Number(id_sucursal)) || Number(id_sucursal) <= 0) {
      errors.push('id_sucursal debe ser un entero positivo para roles de sucursal.');
    }
  }

  if (activo != null && typeof activo !== 'boolean') {
    errors.push('activo debe ser verdadero o falso.');
  }

  if (errors.length) return next(httpError(400, 'VALIDATION_ERROR', errors.join(' ')));

  request.validatedBody = {
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    password: password?.trim(),
    rol,
    id_sucursal: rol === 'admin_general' ? null : Number(id_sucursal),
    activo: activo ?? true
  };

  return next();
}

module.exports = {
  emailPattern,
  httpError,
  validateId,
  validateBranch,
  validateTable,
  validateProduct,
  validateSale,
  validateStartSession,
  validateCashOpen,
  validateCashClose,
  validateReservation,
  validateReservationStatus,
  validateLogin,
  validateUser
};
