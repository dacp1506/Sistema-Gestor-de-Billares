const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const { pool, isDatabaseConfigured } = require('./config/db');
const errorHandler = require('./middlewares/error-handler');
const apiRoutes = require('./routes');

const app = express();
const viewPath = path.join(__dirname, '..', '..', 'views', 'index.html');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
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

app.get('/', (request, response) => response.sendFile(viewPath));
app.get('/index.html', (request, response) => response.sendFile(viewPath));

app.use((request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' }
  });
});

app.use(errorHandler);

module.exports = app;
