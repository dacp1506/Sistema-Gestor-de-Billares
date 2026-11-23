require('dotenv').config();
const app = require('./app');
const { close } = require('./config/db');

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => {
  console.log(`LabCare disponible en http://${host}:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

