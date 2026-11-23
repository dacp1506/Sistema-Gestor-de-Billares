const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
const sslEnabled = process.env.DATABASE_SSL === 'true';
const sslCaPath = process.env.DATABASE_SSL_CA;
const sslCa = sslEnabled && sslCaPath
  ? fs.readFileSync(path.resolve(__dirname, '..', '..', sslCaPath), 'utf8')
  : undefined;

const pool = isDatabaseConfigured
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
  : null;

async function close() {
  if (pool) await pool.end();
}

module.exports = { pool, isDatabaseConfigured, close };

