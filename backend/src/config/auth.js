const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');

const scrypt = promisify(crypto.scrypt);
const SCRYPT_COST = 32768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const SALT_LENGTH = 16;
const configuredSecret = process.env.JWT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}
const JWT_SECRET = configuredSecret || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return { valid: false, needsRehash: false };

  if (/^[a-f\d]{64}$/i.test(storedHash)) {
    const legacyHash = crypto.createHash('sha256').update(password).digest();
    const storedDigest = Buffer.from(storedHash, 'hex');
    return {
      valid: crypto.timingSafeEqual(legacyHash, storedDigest),
      needsRehash: true,
    };
  }

  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return { valid: false, needsRehash: false };
  }

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64url');
  const expectedKey = Buffer.from(parts[5], 'base64url');
  if (
    !Number.isSafeInteger(cost) || cost < 2 || cost > SCRYPT_COST || !Number.isInteger(Math.log2(cost)) ||
    blockSize !== SCRYPT_BLOCK_SIZE ||
    parallelization !== SCRYPT_PARALLELIZATION ||
    salt.length < 8 || salt.length > 64 ||
    expectedKey.length < 32 || expectedKey.length > 128
  ) {
    return { valid: false, needsRehash: false };
  }

  const actualKey = await scrypt(password, salt, expectedKey.length, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  const valid = crypto.timingSafeEqual(actualKey, expectedKey);
  const needsRehash = valid && (
    cost !== SCRYPT_COST ||
    blockSize !== SCRYPT_BLOCK_SIZE ||
    parallelization !== SCRYPT_PARALLELIZATION ||
    expectedKey.length !== SCRYPT_KEY_LENGTH
  );
  return { valid, needsRehash };
}

function issueToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
};
