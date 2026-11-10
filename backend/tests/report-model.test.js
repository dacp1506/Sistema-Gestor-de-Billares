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
        if (calls.length === 1) return { rows: [{}] };
        if (calls.length === 2) return { rows: [] };
        return { rows: [] };
      },
    },
  },
};

const Report = require('../src/models/reportModel');

test('financial report uses safe periods and filters future events for branch totals', async () => {
  const result = await Report.getSummary({ branchId: 7, period: 'diario' });

  assert.equal(result.period, 'diario');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.values), [[7], [7], [7, 7]]);
  assert.match(calls[0].text, /COUNT\(\*\) FILTER/);
  assert.match(calls[2].text, /events\.event_date < NOW\(\)/);
  assert.match(calls[2].text, /s\.id_sucursal = \$2/);
});

test('financial report rejects unsupported periods before querying the database', async () => {
  calls.length = 0;
  await assert.rejects(Report.getSummary({ period: "diario'; SELECT pg_sleep(1); --" }), /Unsupported report period/);
  assert.equal(calls.length, 0);
});
