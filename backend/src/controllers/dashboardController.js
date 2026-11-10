const Dashboard = require('../models/dashboardModel');
const { httpError } = require('../middlewares/validate');

async function get(request, response) {
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  if (!branchId || !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'BRANCH_REQUIRED', 'Selecciona una sucursal para cargar el dashboard.');
  }
  const userId = request.user.rol === 'cajero' ? Number(request.user.sub) : undefined;
  response.json({ data: await Dashboard.findSummary({ branchId: Number(branchId), userId }) });
}

module.exports = { get };
