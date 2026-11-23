const test = require('node:test');
const assert = require('node:assert/strict');

const equipment = {
  id_equipo: 1,
  codigo: 'EQ-001',
  nombre: 'Mesa de billar profesional',
  ubicacion: 'Salón Principal',
  estado: 'OPERATIVO',
  id_sucursal: 2
};

let availableEquipment = equipment;
let existingRequest = { id_solicitud: 10, id_equipo: 1, id_sucursal: 2, estado: 'PENDIENTE', activo: true };
let createdInput = null;

const requestModelPath = require.resolve('../src/models/solicitudModel');
require.cache[requestModelPath] = {
  id: requestModelPath,
  filename: requestModelPath,
  loaded: true,
  exports: {
    async list(filters) {
      return [{ id_solicitud: 10, ...filters }];
    },
    async findActiveById(id) {
      return id === 10 ? { id_solicitud: 10, estado: 'RESUELTA', activo: true } : null;
    },
    async findSystemFieldsById(id) {
      return id === existingRequest.id_solicitud ? existingRequest : null;
    },
    async create(input) {
      createdInput = input;
      return { id_solicitud: 11, codigo_solicitud: 'SOL-20261123-001', ...input };
    },
    async update(id, input) {
      return id === 10 ? { id_solicitud: 10, ...input } : null;
    },
    async changeState(id, estado) {
      return id === 10 ? { id_solicitud: 10, estado } : null;
    },
    async logicalDelete(id) {
      return id === 10 ? { id_solicitud: 10 } : null;
    }
  }
};

const equipmentModelPath = require.resolve('../src/models/equipoModel');
require.cache[equipmentModelPath] = {
  id: equipmentModelPath,
  filename: equipmentModelPath,
  loaded: true,
  exports: {
    async findAvailableByBranch() {
      return availableEquipment ? [availableEquipment] : [];
    },
    async findAvailableById() {
      return availableEquipment;
    },
    async findById() {
      return availableEquipment;
    }
  }
};

const controller = require('../src/controllers/solicitudController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function resetState() {
  availableEquipment = equipment;
  existingRequest = { id_solicitud: 10, id_equipo: 1, id_sucursal: 2, estado: 'PENDIENTE', activo: true };
  createdInput = null;
}

test('registra una solicitud con equipo operativo y estado inicial del servidor', async () => {
  resetState();
  const response = createResponse();
  await controller.create(
    {
      body: {},
      user: { sub: '4', rol: 'cajero', id_sucursal: 2 },
      validatedBody: {
        id_equipo: 1,
        solicitante: 'Ana Pérez',
        descripcion: 'La mesa tiene una banda suelta',
        prioridad: 'ALTA'
      }
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdInput.id_sucursal, 2);
  assert.equal(createdInput.estado, undefined);
  assert.match(response.body.message, /registrada/i);
  assert.equal(response.body.data.codigo_solicitud, 'SOL-20261123-001');
});

test('rechaza equipo inexistente o no operativo sin crear solicitud huérfana', async () => {
  resetState();
  availableEquipment = null;

  await assert.rejects(
    () => controller.create(
      {
        body: {},
        user: { sub: '4', rol: 'cajero', id_sucursal: 2 },
        validatedBody: {
          id_equipo: 999,
          solicitante: 'Ana Pérez',
          descripcion: 'La mesa tiene una banda suelta',
          prioridad: 'MEDIA'
        }
      },
      createResponse()
    ),
    (error) => error.status === 400 && error.code === 'EQUIPMENT_NOT_AVAILABLE'
  );
  assert.equal(createdInput, null);
});

test('admin general debe indicar sucursal al registrar', async () => {
  resetState();
  await assert.rejects(
    () => controller.create(
      {
        body: {},
        user: { sub: '1', rol: 'admin_general' },
        validatedBody: {
          id_equipo: 1,
          solicitante: 'Ana Pérez',
          descripcion: 'La mesa tiene una banda suelta',
          prioridad: 'BAJA'
        }
      },
      createResponse()
    ),
    (error) => error.status === 400 && error.code === 'BRANCH_REQUIRED'
  );
});

test('cambio de estado permitido responde 200', async () => {
  resetState();
  const response = createResponse();
  await controller.changeState(
    {
      params: { id: '10' },
      user: { sub: '2', rol: 'admin_sucursal', id_sucursal: 2 },
      validatedBody: { estado: 'EN_PROCESO' }
    },
    response,
    (error) => { throw error; }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.estado, 'EN_PROCESO');
  assert.match(response.body.message, /EN_PROCESO/);
});

test('rechaza transición RESUELTA a PENDIENTE con 409 y conserva el estado', async () => {
  resetState();
  existingRequest = { ...existingRequest, estado: 'RESUELTA' };
  let nextError;
  const response = createResponse();

  await controller.changeState(
    {
      params: { id: '10' },
      user: { sub: '2', rol: 'admin_sucursal', id_sucursal: 2 },
      validatedBody: { estado: 'PENDIENTE' }
    },
    response,
    (error) => { nextError = error; }
  );

  assert.equal(response.body, null);
  assert.equal(nextError.status, 409);
  assert.equal(nextError.code, 'STATE_TRANSITION_NOT_ALLOWED');
});

test('detalle y eliminación de una solicitud inexistente responden 404 controlado', async () => {
  resetState();
  let detailError;
  await controller.get({ params: { id: '999' }, user: { rol: 'admin_general' } }, createResponse(), (error) => {
    detailError = error;
  });
  assert.equal(detailError.status, 404);

  let deleteError;
  await controller.logicalDelete({ params: { id: '999' } }, createResponse(), (error) => {
    deleteError = error;
  });
  assert.equal(deleteError.status, 404);
});

test('eliminación lógica responde activo=false sin borrar físicamente', async () => {
  resetState();
  const response = createResponse();
  await controller.logicalDelete({ params: { id: '10' } }, response, (error) => { throw error; });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data, { id_solicitud: 10, activo: false });
});

test('listado exige sucursal para admin general y pasa filtros válidos', async () => {
  resetState();
  await assert.rejects(
    () => controller.list({ query: {}, user: { rol: 'admin_general' } }, createResponse()),
    (error) => error.status === 400 && error.code === 'BRANCH_REQUIRED'
  );

  const response = createResponse();
  await controller.list(
    {
      query: { id_sucursal: '2', q: 'mesa', prioridad: 'alta', estado: 'pendiente' },
      user: { rol: 'admin_general' }
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data[0], {
    id_solicitud: 10,
    branchId: 2,
    q: 'mesa',
    prioridad: 'ALTA',
    estado: 'PENDIENTE'
  });
});

test('listado rechaza filtros de prioridad o estado inválidos', async () => {
  resetState();
  await assert.rejects(
    () => controller.list(
      { query: { id_sucursal: '2', prioridad: 'URGENTE' }, user: { rol: 'admin_general' } },
      createResponse()
    ),
    (error) => error.status === 400 && error.code === 'VALIDATION_ERROR'
  );
});
