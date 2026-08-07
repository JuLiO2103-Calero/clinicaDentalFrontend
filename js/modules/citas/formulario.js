// ============================================================
// citas/formulario.js — Crear o editar una cita
// Sucursal seleccionable → carga doctores/asistentes de esa sucursal.
// Admins-doctores aparecen en todas las sucursales.
// ============================================================
import Api from '../../core/api.js';
import State from '../../core/state.js';
import UI from '../../utils/ui.js';
const SERVICIOS = [
    { id: 1, nombre: 'Consulta general', precio: 300 },
    { id: 2, nombre: 'Limpieza dental', precio: 600 },
    { id: 3, nombre: 'Extracción simple', precio: 800 },
    { id: 4, nombre: 'Extracción molar', precio: 1500 },
    { id: 5, nombre: 'Resina / Empaste', precio: 900 },
    { id: 6, nombre: 'Tratamiento de conducto', precio: 3500 },
    { id: 7, nombre: 'Corona dental', precio: 5000 },
    { id: 8, nombre: 'Blanqueamiento dental', precio: 2500 },
    { id: 9, nombre: 'Ortodoncia mensualidad', precio: 1200 },
    { id: 10, nombre: 'Radiografía panorámica', precio: 800 },
];
let _todosUsuarios = [];
let _cita = null;
// fechaInicial (opcional): "2026-08-08T10:00" para preseleccionar en el campo
export async function renderFormulario(container, citaId, fechaInicial = null) {
    const esEdicion = citaId !== null;
    _cita = null;
    UI.showLoader();
    const [resU, resSuc] = await Promise.all([
        Api.get('/api/usuarios/personal'),
        Api.get('/api/sucursales')
    ]);
    _todosUsuarios = resU.ok ? resU.datos : [];
    const sucursales = resSuc.ok ? resSuc.datos : [];
    if (esEdicion) {
        const res = await Api.get(`/api/citas/${citaId}`);
        if (res.ok) _cita = res.datos;
    }
    UI.hideLoader();
    // Sucursal por defecto: la del usuario logueado, o la primera disponible
    const miSucursal = State.getUsuario()?.sucursalId ?? (sucursales[0]?.id ?? 1);
    const sucDefault = _cita?.sucursalId ?? miSucursal;
    const opsSuc = sucursales.map(s =>
        `<option value="${s.id}" ${s.id === sucDefault ? 'selected' : ''}>${s.nombre}</option>`).join('');
    const opsServ = `<option value="">Sin servicio</option>` + SERVICIOS.map(s =>
        `<option value="${s.id}" ${_cita?.servicioId === s.id ? 'selected' : ''}>${s.nombre} (${UI.moneda(s.precio)})</option>`).join('');
    // Valor de fecha/hora: si es edición usa la de la cita; si viene fechaInicial
    // (desde el calendario) la usa; si no, vacío.
    let fechaVal = '';
    if (_cita) {
        fechaVal = new Date(_cita.fechaHora).toISOString().slice(0, 16);
    } else if (fechaInicial) {
        fechaVal = fechaInicial.slice(0, 16); // "2026-08-08T10:00"
    }
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">${esEdicion ? 'Editar cita #' + citaId : 'Nueva cita'}</h1>
                <p class="page-subtitle">${esEdicion ? 'Modificar datos de la cita' : 'Programar una nueva cita'}</p>
            </div>
            <button class="btn btn-ghost" id="btn-volver-form">← Volver</button>
        </div>
        <div class="card" style="max-width:680px">
            <div class="card-body">
                <form id="form-cita" novalidate>
                    <div class="form-group mb-4">
                        <label class="form-label">Paciente <span class="required">*</span></label>
                        <div style="display:flex;gap:var(--sp-2)">
                            <input type="text" class="form-control" id="input-pac-buscar"
                                placeholder="Nombre, cédula o expediente..." value="${_cita?.paciente ?? ''}" />
                            <button type="button" class="btn btn-outline" id="btn-buscar-pac">Buscar</button>
                        </div>
                        <input type="hidden" id="campo-paciente-id" value="${_cita?.pacienteId ?? ''}" />
                        <span class="form-error" id="campo-paciente-id-error"></span>
                        <div id="lista-pacientes" class="hidden" style="border:1px solid var(--color-border);border-radius:var(--radius);margin-top:4px;max-height:200px;overflow-y:auto;background:var(--color-surface)"></div>
                    </div>
                    <!-- Sucursal -->
                    <div class="form-group mb-4">
                        <label class="form-label">Sucursal <span class="required">*</span></label>
                        <select class="form-control" id="campo-sucursal-id">${opsSuc}</select>
                        <span class="form-hint">Los doctores y asistentes se filtran según la sucursal seleccionada</span>
                    </div>
                    <div class="form-row mb-4">
                        <div class="form-group"><label class="form-label">Doctor <span class="required">*</span></label>
                            <select class="form-control" id="campo-doctor-id"><option value="">Seleccionar...</option></select>
                            <span class="form-error" id="campo-doctor-id-error"></span></div>
                        <div class="form-group"><label class="form-label">Asistente</label>
                            <select class="form-control" id="campo-asistente-id"><option value="">Sin asistente</option></select></div>
                    </div>
                    <div class="form-row mb-4">
                        <div class="form-group"><label class="form-label">Fecha y hora <span class="required">*</span></label>
                            <input type="datetime-local" class="form-control" id="campo-fecha-hora" value="${fechaVal}" />
                            <span class="form-error" id="campo-fecha-hora-error"></span></div>
                        <div class="form-group"><label class="form-label">Duración (min)</label>
                            <input type="number" class="form-control" id="campo-duracion" value="${_cita?.duracionMin ?? 30}" min="10" max="480" /></div>
                    </div>
                    <div class="form-group mb-4"><label class="form-label">Servicio</label>
                        <select class="form-control" id="campo-servicio-id">${opsServ}</select></div>
                    <div class="form-group mb-4"><label class="form-label">Motivo</label>
                        <input type="text" class="form-control" id="campo-motivo" value="${_cita?.motivo ?? ''}" maxlength="255" /></div>
                    <div class="form-group mb-4"><label class="form-label">Notas</label>
                        <textarea class="form-control" id="campo-notas" rows="3">${_cita?.notas ?? ''}</textarea></div>
                    <div style="display:flex;gap:var(--sp-3);justify-content:flex-end">
                        <button type="button" class="btn btn-ghost" id="btn-cancelar-form">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-guardar">${esEdicion ? 'Guardar cambios' : 'Programar cita'}</button>
                    </div>
                </form>
            </div>
        </div>`;
    // Bind
    document.getElementById('btn-volver-form').addEventListener('click', () => { window.location.hash = '#/citas'; });
    document.getElementById('btn-cancelar-form').addEventListener('click', () => { window.location.hash = '#/citas'; });
    document.getElementById('btn-buscar-pac').addEventListener('click', buscarPaciente);
    document.getElementById('input-pac-buscar').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarPaciente(); } });
    document.getElementById('campo-sucursal-id').addEventListener('change', () => cargarPersonalPorSucursal());
    document.getElementById('form-cita').addEventListener('submit', async e => { e.preventDefault(); await guardar(esEdicion ? citaId : null); });
    // Cargar doctores/asistentes de la sucursal seleccionada
    cargarPersonalPorSucursal();
}
function cargarPersonalPorSucursal() {
    const sucId = parseInt(document.getElementById('campo-sucursal-id').value);
    // Doctores: los de esta sucursal + admins que sean doctor (sucursalId null = todas)
    const doctores = _todosUsuarios.filter(u =>
        u.rol === 'doctor' && u.activo && (u.sucursalId === sucId || u.sucursalId === null)
    );
    // Asistentes: los de esta sucursal + admins asistente (sucursalId null)
    const asistentes = _todosUsuarios.filter(u =>
        u.rol === 'asistente' && u.activo && (u.sucursalId === sucId || u.sucursalId === null)
    );
    const selDoc = document.getElementById('campo-doctor-id');
    const prevDoc = _cita?.doctorId || parseInt(selDoc.value) || 0;
    selDoc.innerHTML = '<option value="">Seleccionar...</option>' +
        doctores.map(d => `<option value="${d.id}" ${d.id === prevDoc ? 'selected' : ''}>${d.nombreCompleto}</option>`).join('');
    const selAsis = document.getElementById('campo-asistente-id');
    const prevAsis = _cita?.asistenteId || parseInt(selAsis.value) || 0;
    selAsis.innerHTML = '<option value="">Sin asistente</option>' +
        asistentes.map(a => `<option value="${a.id}" ${a.id === prevAsis ? 'selected' : ''}>${a.nombreCompleto}</option>`).join('');
    // Si no hay doctores en esta sucursal, avisar
    if (!doctores.length) {
        selDoc.innerHTML = '<option value="">— Sin doctores en esta sucursal —</option>';
    }
}
async function buscarPaciente() {
    const q = document.getElementById('input-pac-buscar').value.trim();
    if (q.length < 2) { UI.toast('Escribe al menos 2 caracteres', 'warning'); return; }
    const res = await Api.get(Api.buildUrl('/api/pacientes/buscar', { q }));
    const lista = document.getElementById('lista-pacientes');
    if (!res.ok || !res.datos?.length) {
        lista.innerHTML = '<div style="padding:var(--sp-3);font-size:var(--fs-sm);color:var(--color-text-muted)">Sin resultados</div>';
        lista.classList.remove('hidden'); return;
    }
    lista.innerHTML = res.datos.map(p => `
        <div class="pac-opt" data-id="${p.id}" data-nombre="${p.nombreCompleto}"
            style="padding:var(--sp-2) var(--sp-3);cursor:pointer;font-size:var(--fs-sm);border-bottom:1px solid var(--color-border);transition:background var(--transition)">
            <div><strong>${p.nombreCompleto}</strong></div>
            <div class="text-xs text-muted">${p.numeroExpediente}${p.cedula ? ' · ' + p.cedula : ''}${p.telefono ? ' · ' + p.telefono : ''}</div>
        </div>`).join('');
    lista.classList.remove('hidden');
    lista.querySelectorAll('.pac-opt').forEach(el => {
        el.addEventListener('mouseenter', () => el.style.background = 'var(--color-bg)');
        el.addEventListener('mouseleave', () => el.style.background = '');
        el.addEventListener('click', () => {
            document.getElementById('campo-paciente-id').value = el.dataset.id;
            document.getElementById('input-pac-buscar').value = el.dataset.nombre;
            lista.classList.add('hidden');
            UI.clearFieldError('campo-paciente-id');
        });
    });
}
async function guardar(citaId) {
    const get = id => document.getElementById(id);
    const pacienteId = parseInt(get('campo-paciente-id').value);
    const doctorId = parseInt(get('campo-doctor-id').value);
    const asistenteId = parseInt(get('campo-asistente-id').value) || null;
    const servicioId = parseInt(get('campo-servicio-id').value) || null;
    const fechaHora = get('campo-fecha-hora').value;
    const duracionMin = parseInt(get('campo-duracion').value) || 30;
    const motivo = get('campo-motivo').value.trim() || null;
    const notas = get('campo-notas').value.trim() || null;
    const sucursalId = parseInt(get('campo-sucursal-id').value);
    let valid = true;
    if (!pacienteId) { UI.setFieldError('campo-paciente-id', 'Busca y selecciona un paciente.'); valid = false; }
    if (!doctorId) { UI.setFieldError('campo-doctor-id', 'Selecciona un doctor.'); valid = false; }
    if (!fechaHora) { UI.setFieldError('campo-fecha-hora', 'La fecha es obligatoria.'); valid = false; }
    if (!valid) return;
    const body = { pacienteId, doctorId, asistenteId, servicioId, sucursalId, fechaHora, duracionMin, motivo, notas };
    const btn = get('btn-guardar');
    btn.disabled = true; btn.textContent = 'Guardando…';
    UI.showLoader();
    const res = citaId ? await Api.put(`/api/citas/${citaId}`, body) : await Api.post('/api/citas', body);
    UI.hideLoader();
    btn.disabled = false; btn.textContent = citaId ? 'Guardar cambios' : 'Programar cita';
    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    window.location.hash = `#/citas/${res.datos.id}`;
}
