const Equipo = require('../models/equipoModel');
const { httpError } = require('../middlewares/validate');

function resolveBranchId(request) {
  if (request.user.rol !== 'admin_general') return Number(request.user.id_sucursal);
  const requested = request.query?.id_sucursal;
  if (requested == null || !/^[1-9]\d*$/.test(String(requested))) return null;
  return Number(requested);
}

async function list(request, response) {
  const branchId = resolveBranchId(request);
  if (!branchId) {
    throw httpError(400, 'BRANCH_REQUIRED', 'Indica la sucursal con ?id_sucursal=.');
  }
  response.json({ data: await Equipo.findAvailableByBranch(branchId) });
}

module.exports = { list };
