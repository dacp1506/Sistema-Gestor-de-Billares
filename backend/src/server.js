require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const app = require('./app');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

const server = app.listen(port, host, () => {
  console.log(`Bola8 disponible en http://${host}:${port}`);
});

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando servidor Bola8...`);
  server.close(async (error) => {
    if (error) {
      console.error('Error al cerrar el servidor HTTP:', error);
      process.exitCode = 1;
    }

    await require('./config/db').close();
    process.exit();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
