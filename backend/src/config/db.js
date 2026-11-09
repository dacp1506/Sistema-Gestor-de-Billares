const { Pool } = require('pg');

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
const sslEnabled = process.env.DATABASE_SSL === 'true';

const pool = isDatabaseConfigured
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: true } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
  : null;

if (pool) {
  pool.on('error', (error) => {
    console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error);
  });
}

async function close() {
  if (pool) await pool.end();
}

module.exports = { pool, isDatabaseConfigured, close };
