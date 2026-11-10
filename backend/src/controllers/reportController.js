const Report = require('../models/reportModel');
const { httpError } = require('../middlewares/validate');

const supportedPeriods = new Set(['diario', 'semanal', 'mensual', 'anual']);

async function get(request, response) {
  const period = request.query.periodo || 'diario';
  if (!supportedPeriods.has(period)) {
    throw httpError(400, 'INVALID_REPORT_PERIOD', 'periodo debe ser diario, semanal, mensual o anual.');
  }
  const branchId = request.user.rol === 'admin_general'
    ? request.query.id_sucursal
    : request.user.id_sucursal;
  if (branchId && !/^[1-9]\d*$/.test(String(branchId))) {
    throw httpError(400, 'INVALID_BRANCH_ID', 'id_sucursal debe ser un entero positivo.');
  }
  response.json({
    data: await Report.getSummary({ branchId: branchId ? Number(branchId) : undefined, period }),
  });
}

module.exports = { get };
