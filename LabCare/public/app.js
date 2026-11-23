const form = document.querySelector('#create-form');
const editForm = document.querySelector('#edit-form');
const tableBody = document.querySelector('#solicitudes-body');
const message = document.querySelector('#message');
let equipos = [];

function showMessage(text, type = 'success') {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.error?.details;
    const detailText = detail ? Object.values(detail).join(' ') : '';
    throw new Error(body.error?.message ? `${body.error.message}${detailText ? ` ${detailText}` : ''}` : 'Ocurrio un error.');
  }
  return body;
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

async function loadEquipos() {
  const { data } = await api('/api/equipos');
  equipos = data;
  for (const selectId of ['equipo', 'edit-equipo']) {
    const select = document.querySelector(`#${selectId}`);
    select.innerHTML = '<option value="">Seleccione un equipo</option>' +
      data.map(item => `<option value="${item.id}">${escapeHtml(item.codigo)} - ${escapeHtml(item.nombre)}</option>`).join('');
  }
}

async function loadSolicitudes() {
  const params = new URLSearchParams();
  const q = document.querySelector('#search').value.trim();
  const prioridad = document.querySelector('#filter-prioridad').value;
  const estado = document.querySelector('#filter-estado').value;
  if (q) params.set('q', q);
  if (prioridad) params.set('prioridad', prioridad);
  if (estado) params.set('estado', estado);

  try {
    const { data } = await api(`/api/solicitudes${params.size ? `?${params}` : ''}`);
    tableBody.innerHTML = data.length ? data.map(item => `
      <tr>
        <td>${escapeHtml(item.codigo_solicitud)}</td>
        <td>${escapeHtml(item.equipo_codigo)} - ${escapeHtml(item.equipo)}</td>
        <td>${escapeHtml(item.solicitante)}</td>
        <td>${escapeHtml(item.prioridad)}</td>
        <td>${escapeHtml(item.estado)}</td>
        <td>${new Date(item.fecha_registro).toLocaleString('es-BO')}</td>
        <td>
          <div class="actions">
            <button type="button" onclick="showDetail(${item.id})">Detalle</button>
            <button type="button" onclick="showEdit(${item.id})">Editar</button>
            <button type="button" onclick="advanceState(${item.id}, '${item.estado}')">Estado</button>
            <button type="button" class="danger" onclick="deleteSolicitud(${item.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('') :
      '<tr><td colspan="7">No hay solicitudes que coincidan.</td></tr>';
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

form.addEventListener('submit', async event => {
  event.preventEvent?.();
  event.preventDefault();
  const payload = {
    equipo_id: Number(document.querySelector('#equipo').value),
    solicitante: document.querySelector('#solicitante').value,
    descripcion: document.querySelector('#descripcion').value,
    prioridad: document.querySelector('#prioridad').value
  };
  try {
    const result = await api('/api/solicitudes', { method: 'POST', body: JSON.stringify(payload) });
    showMessage(result.message);
    form.reset();
    await loadSolicitudes();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

async function showDetail(id) {
  try {
    const { data } = await api(`/api/solicitudes/${id}`);
    document.querySelector('#detail-content').innerHTML = `
      <p><strong>Codigo:</strong> ${escapeHtml(data.codigo_solicitud)}</p>
      <p><strong>Equipo:</strong> ${escapeHtml(data.equipo_codigo)} - ${escapeHtml(data.equipo)}</p>
      <p><strong>Ubicacion:</strong> ${escapeHtml(data.equipo_ubicacion)}</p>
      <p><strong>Solicitante:</strong> ${escapeHtml(data.solicitante)}</p>
      <p><strong>Descripcion:</strong> ${escapeHtml(data.descripcion)}</p>
      <p><strong>Prioridad:</strong> ${escapeHtml(data.prioridad)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(data.estado)}</p>
      <p><strong>Fecha de registro:</strong> ${new Date(data.fecha_registro).toLocaleString('es-BO')}</p>`;
    document.querySelector('#detail-dialog').showModal();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function showEdit(id) {
  try {
    const { data } = await api(`/api/solicitudes/${id}`);
    document.querySelector('#edit-id').value = data.id;
    document.querySelector('#edit-equipo').value = data.equipo_id;
    document.querySelector('#edit-solicitante').value = data.solicitante;
    document.querySelector('#edit-descripcion').value = data.descripcion;
    document.querySelector('#edit-prioridad').value = data.prioridad;
    document.querySelector('#edit-dialog').showModal();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

editForm.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.querySelector('#edit-id').value;
  const payload = {
    equipo_id: Number(document.querySelector('#edit-equipo').value),
    solicitante: document.querySelector('#edit-solicitante').value,
    descripcion: document.querySelector('#edit-descripcion').value,
    prioridad: document.querySelector('#edit-prioridad').value
  };
  try {
    const result = await api(`/api/solicitudes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    document.querySelector('#edit-dialog').close();
    showMessage(result.message);
    await loadSolicitudes();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

async function advanceState(id, current) {
  let next;
  if (current === 'PENDIENTE') {
    next = window.prompt('Nuevo estado permitido: EN_PROCESO o CANCELADA', 'EN_PROCESO');
  } else if (current === 'EN_PROCESO') {
    next = window.prompt('Nuevo estado permitido: RESUELTA o CANCELADA', 'RESUELTA');
  } else {
    showMessage(`El estado ${current} es final y no permite cambios.`, 'error');
    return;
  }
  if (!next) return;
  try {
    const result = await api(`/api/solicitudes/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: next })
    });
    showMessage(result.message);
    await loadSolicitudes();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function deleteSolicitud(id) {
  if (!window.confirm('Confirma que desea eliminar logicamente esta solicitud?')) return;
  try {
    const result = await api(`/api/solicitudes/${id}`, { method: 'DELETE' });
    showMessage(result.message);
    await loadSolicitudes();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close());
});
document.querySelector('#search').addEventListener('input', loadSolicitudes);
document.querySelector('#filter-prioridad').addEventListener('change', loadSolicitudes);
document.querySelector('#filter-estado').addEventListener('change', loadSolicitudes);

Promise.all([loadEquipos(), loadSolicitudes()]).catch(error => showMessage(error.message, 'error'));

