const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/db');
const calls = [];
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    pool: {
      async query(text, values) {
        calls.push({ text, values: [...values] });
        return { rows: [{}] };
      },
    },
  },
};

const Dashboard = require('../src/models/dashboardModel');

test('cashier dashboard scopes active sessions, sales and cash to the authenticated user', async () => {
  calls.length = 0;
  await Dashboard.findSummary({ branchId: 3, userId: 9 });

  const salesQuery = calls.find(({ text }) => text.includes('FROM ventas') && text.includes('SUM(total_productos)'));
  const recentSalesQuery = calls.find(({ text }) => text.includes('FROM ventas v'));
  const sessionsQuery = calls.find(({ text }) => text.includes('FROM sesiones_mesa sm'));
  const cashQuery = calls.find(({ text }) => text.includes('FROM caja_turnos'));

  assert.deepEqual(salesQuery.values, [3, 9]);
  assert.match(salesQuery.text, /AND id_usuario = \$2/);
  assert.deepEqual(recentSalesQuery.values, [3, 9]);
  assert.match(recentSalesQuery.text, /AND v\.id_usuario = \$2/);
  assert.deepEqual(sessionsQuery.values, [3, 9]);
  assert.match(sessionsQuery.text, /AND sm\.id_usuario = \$2/);
  assert.deepEqual(cashQuery.values, [3, 9]);
  assert.match(cashQuery.text, /AND id_usuario = \$2/);
});
