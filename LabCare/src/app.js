const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { pool, isDatabaseConfigured } = require('./config/db');
const solicitudesRoutes = require('./routes/solicitudesRoutes');
const equiposRoutes = require('./routes/equiposRoutes');
const errorHandler = require('./middlewares/error-handler');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', async (request, response, next) => {
  if (!isDatabaseConfigured) {
    return response.status(503).json({
      status: 'degraded',
      database: 'not_configured',
      message: 'Configure DATABASE_URL.'
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
      error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Configure DATABASE_URL antes de usar la API.' }
    });
  }
  return next();
});
app.use('/api/equipos', equiposRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

app.use((request, response) => {
  if (request.path.startsWith('/api/')) {
    return response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' }
    });
  }
  return response.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);
module.exports = app;

