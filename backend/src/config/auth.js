const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const configuredSecret = process.env.JWT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}
const JWT_SECRET = configuredSecret || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function issueToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, hashPassword, issueToken, verifyToken };
