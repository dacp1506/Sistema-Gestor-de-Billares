const Producto = require('../models/productoModel');
const { httpError } = require('../middlewares/validate');

async function list(request, response) {
  const branchId = request.query.id_sucursal;
  if (!branchId || !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'BRANCH_REQUIRED', 'Indica la sucursal con ?id_sucursal=.');
  }
  response.json({ data: await Producto.findByBranch(Number(branchId)) });
}

async function get(request, response, next) {
  const product = await Producto.findById(Number(request.params.id));
  if (!product) return next(httpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto solicitado.'));
  return response.json({ data: product });
}

async function create(request, response) {
  if (!request.validatedBody.id_sucursal) {
    throw httpError(400, 'BRANCH_REQUIRED', 'id_sucursal es obligatorio al registrar un producto.');
  }
  const product = await Producto.create(request.validatedBody);
  response.status(201).json({ data: product });
}

async function update(request, response, next) {
  const product = await Producto.update(Number(request.params.id), request.validatedBody);
  if (!product) return next(httpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró un producto activo con ese identificador.'));
  return response.json({ data: product });
}

async function deactivate(request, response, next) {
  const product = await Producto.deactivate(Number(request.params.id));
  if (!product) return next(httpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró un producto activo con ese identificador.'));
  return response.json({ data: product, message: 'Producto desactivado.' });
}

module.exports = { list, get, create, update, deactivate };
