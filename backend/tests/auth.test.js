const test = require('node:test');
const assert = require('node:assert/strict');
const { issueToken } = require('../src/config/auth');
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
