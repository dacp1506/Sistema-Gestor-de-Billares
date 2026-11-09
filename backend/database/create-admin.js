const path = require('node:path');
const readline = require('node:readline/promises');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { pool, isDatabaseConfigured, close } = require('../src/config/db');
const { hashPassword } = require('../src/config/auth');

function promptPassword(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Ejecuta este comando desde una terminal interactiva para ocultar la contraseña.');
  }

  return new Promise((resolve, reject) => {
    let password = '';
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (chunk) => {
      const input = chunk.toString('utf8');
      if (input === '\u0003') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        reject(new Error('Operación cancelada.'));
        return;
      }
      if (input === '\r' || input === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (input === '\u007f' || input === '\b') {
        password = password.slice(0, -1);
        return;
      }
      if (input >= ' ') password += input;
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  if (!isDatabaseConfigured || !pool) {
    throw new Error('DATABASE_URL no está configurado en backend/.env.');
  }

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const nombre = (await prompt.question('Nombre del administrador: ')).trim();
  const email = (await prompt.question('Correo del administrador: ')).trim().toLowerCase();
  prompt.close();

  if (!nombre || nombre.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ingresa un nombre y un correo válidos.');
  }

  const password = await promptPassword('Contraseña nueva (mínimo 12 caracteres, entrada oculta): ');
  if (password.length < 12 || password.length > 255) {
    throw new Error('La contraseña debe tener entre 12 y 255 caracteres.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingAdmin = await client.query(
      `SELECT 1 FROM usuarios
       WHERE rol = 'admin_general' AND activo = TRUE
       LIMIT 1`,
    );
    if (existingAdmin.rowCount) {
      throw new Error('Ya existe un administrador general activo; crea operadores desde la aplicación.');
    }

    await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, id_sucursal, activo)
       VALUES ($1, $2, $3, 'admin_general', NULL, TRUE)`,
      [nombre, email, await hashPassword(password)],
    );
    await client.query('COMMIT');
    console.log(`Administrador creado para ${email}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(`No se pudo crear el administrador: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(close);
