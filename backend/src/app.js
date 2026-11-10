const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { pool, isDatabaseConfigured } = require('./config/db');
const errorHandler = require('./middlewares/error-handler');
const apiRoutes = require('./routes');

const app = express();

const allowedLocalHostnames = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.0.2.2',
  '[::1]'
]);

const normalizeOrigin = (value) => {
  try {
    const url = new URL(value);
    return url.hostname;
  } catch {
    return '';
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const hostname = normalizeOrigin(origin);
  if (!hostname) return false;
  if (allowedLocalHostnames.has(hostname)) return true;

  const isPrivateLan = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
  return isPrivateLan;
};

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
const frontendOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081,http://0.0.0.0:8081')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isExplicitlyAllowed = frontendOrigins.includes(origin) || isAllowedOrigin(origin);
    return callback(null, isExplicitlyAllowed ? true : false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (request, response, next) => {
  if (!isDatabaseConfigured) {
    return response.status(503).json({
      status: 'degraded',
      database: 'not_configured',
      message: 'Configura DATABASE_URL para habilitar la API.'
    });
  }

  try {
    await pool.query('SELECT 1');
    return response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (request, response, next) => {
  if (!isDatabaseConfigured) {
    return response.status(503).json({
      error: {
        code: 'DATABASE_NOT_CONFIGURED',
        message: 'Configura DATABASE_URL en el archivo .env para utilizar la API.'
      }
    });
  }

  return next();
}, apiRoutes);

app.use((request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' }
  });
});

app.use(errorHandler);

module.exports = app;
