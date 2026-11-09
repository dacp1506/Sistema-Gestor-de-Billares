const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  issueToken,
  hashPassword,
  verifyPassword,
} = require('../src/config/auth');
const {
  requireAuth,
  requireRole,
  requireBranchAccess,
} = require('../src/middlewares/auth');

function runMiddleware(middleware, request) {
  let error;
  let nextCalled = false;
  middleware(request, {}, (nextError) => {
    error = nextError;
    nextCalled = !nextError;
  });
  return { error, nextCalled, request };
}

test('password hashes use a per-password salt and verify securely', async () => {
  const firstHash = await hashPassword('a strong password');
  const secondHash = await hashPassword('a strong password');

  assert.match(firstHash, /^scrypt\$32768\$8\$1\$/);
  assert.notEqual(firstHash, secondHash);
  assert.deepEqual(await verifyPassword('a strong password', firstHash), {
    valid: true,
    needsRehash: false,
  });
  assert.deepEqual(await verifyPassword('another password', firstHash), {
    valid: false,
    needsRehash: false,
  });
});

test('legacy SHA-256 password hashes are accepted only for migration', async () => {
  const legacyHash = crypto.createHash('sha256').update('legacy password').digest('hex');
  assert.deepEqual(await verifyPassword('legacy password', legacyHash), {
    valid: true,
    needsRehash: true,
  });
  assert.deepEqual(await verifyPassword('wrong password', legacyHash), {
    valid: false,
    needsRehash: true,
  });
  assert.deepEqual(await verifyPassword('anything', 'invalid'), {
    valid: false,
    needsRehash: false,
  });
});

test('requireAuth rejects missing and invalid bearer tokens', () => {
  const missing = runMiddleware(requireAuth, { headers: {} });
  assert.equal(missing.error.status, 401);
  assert.equal(missing.error.code, 'AUTH_REQUIRED');

  const invalid = runMiddleware(requireAuth, {
    headers: { authorization: 'Bearer not-a-valid-jwt' },
  });
  assert.equal(invalid.error.status, 401);
  assert.equal(invalid.error.code, 'INVALID_TOKEN');
});

test('requireAuth attaches signed identity and role checks it', () => {
  const token = issueToken({ sub: '12', rol: 'cajero', id_sucursal: '3' });
  const authenticated = runMiddleware(requireAuth, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(authenticated.nextCalled, true);
  assert.equal(authenticated.request.user.sub, '12');

  const permitted = runMiddleware(requireRole('cajero'), {
    user: authenticated.request.user,
  });
  assert.equal(permitted.nextCalled, true);

  const denied = runMiddleware(requireRole('admin_general'), {
    user: authenticated.request.user,
  });
  assert.equal(denied.error.status, 403);
  assert.equal(denied.error.code, 'FORBIDDEN');
});

test('branch scope rejects another branch and permits the assigned branch', () => {
  const user = { rol: 'cajero', id_sucursal: '3' };
  const denied = runMiddleware(requireBranchAccess, {
    user,
    params: {},
    query: { id_sucursal: '4' },
    body: {},
  });
  assert.equal(denied.error.status, 403);
  assert.equal(denied.error.code, 'BRANCH_FORBIDDEN');

  const allowed = runMiddleware(requireBranchAccess, {
    user,
    params: {},
    query: { id_sucursal: '3' },
    body: {},
  });
  assert.equal(allowed.nextCalled, true);
});
