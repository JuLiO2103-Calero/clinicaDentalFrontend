// ============================================================
// pacientes/formulario.js — Crear o editar paciente
// ============================================================

import Api from '../../core/api.js';
import UI from '../../utils/ui.js';

export async function renderFormulario(container, pacienteId) {
    const esEdicion = pacienteId !== null;
    let paciente = null;

    if (esEdicion) {
        UI.showLoader();
        const res = await Api.get(`/api/pacientes/${pacienteId}`);
        UI.hideLoader();
        if (!res.ok) { UI.toast(res.mensaje, 'error'); window.location.hash = '#/pacientes'; return; }
        paciente = res.datos;
    }

    const v = (campo) => paciente?.[campo] ?? '';
    const fechaNac = paciente?.fechaNacimiento ? paciente.fechaNacimiento.split('T')[0] : '';

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">${esEdicion ? 'Editar paciente' : 'Nuevo paciente'}</h1>
                <p class="page-subtitle">${esEdicion ? `${paciente.nombreCompleto} · ${paciente.numeroExpediente}` : 'El expediente se genera automáticamente'}</p>
            </div>
            <button class="btn btn-ghost" id="btn-volver-pac">← Volver</button>
        </div>

        <div class="card" style="max-width:720px">
            <div class="card-body">
                <form id="form-paciente" novalidate>

                    <h3 style="font-size:var(--fs-base);font-weight:600;margin-bottom:var(--sp-4);color:var(--color-text-muted)">
                        Datos personales
                    </h3>

                    <div class="form-row mb-4">
                        <div class="form-group">
                            <label class="form-label">Nombres <span class="required">*</span></label>
                            <input type="text" class="form-control" id="pac-nombre" value="${v('nombre')}" maxlength="100" />
                            <span class="form-error" id="pac-nombre-error"></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Apellidos <span class="required">*</span></label>
                            <input type="text" class="form-control" id="pac-apellido" value="${v('apellido')}" maxlength="100" />
                            <span class="form-error" id="pac-apellido-error"></span>
                        </div>
                    </div>

                    <div class="form-row mb-4">
                        <div class="form-group">
                            <label class="form-label">Cédula</label>
                            <input type="text" class="form-control" id="pac-cedula" value="${v('cedulaFormateada') || v('cedula')}"
                                placeholder="000-000000-0000X" maxlength="20" />
                            <span class="form-hint">Se almacena sin guiones automáticamente</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha de nacimiento</label>
                            <input type="date" class="form-control" id="pac-nacimiento" value="${fechaNac}" />
                        </div>
                    </div>

                    <div class="form-row-3 mb-4">
                        <div class="form-group">
                            <label class="form-label">Sexo</label>
                            <select class="form-control" id="pac-sexo">
                                <option value="">Sin especificar</option>
                                <option value="M" ${v('sexo') === 'M' ? 'selected' : ''}>Masculino</option>
                                <option value="F" ${v('sexo') === 'F' ? 'selected' : ''}>Femenino</option>
                                <option value="otro" ${v('sexo') === 'otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo de sangre</label>
                            <select class="form-control" id="pac-sangre">
                                <option value="">Desconocido</option>
                                ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t =>
        `<option value="${t}" ${v('tipoSangre') === t ? 'selected' : ''}>${t}</option>`
    ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" id="pac-email" value="${v('email')}" maxlength="150" />
                        </div>
                    </div>

                    <h3 style="font-size:var(--fs-base);font-weight:600;margin-bottom:var(--sp-4);margin-top:var(--sp-6);color:var(--color-text-muted)">
                        Contacto
                    </h3>

                    <div class="form-row mb-4">
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input type="text" class="form-control" id="pac-telefono" value="${v('telefono')}" maxlength="20" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teléfono de emergencia</label>
                            <input type="text" class="form-control" id="pac-tel-emergencia" value="${v('telefonoEmergencia')}" maxlength="20" />
                        </div>
                    </div>

                    <div class="form-group mb-4">
                        <label class="form-label">Dirección</label>
                        <textarea class="form-control" id="pac-direccion" rows="2">${v('direccion')}</textarea>
                    </div>

                    <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;border-top:1px solid var(--color-border);padding-top:var(--sp-4)">
                        <button type="button" class="btn btn-ghost" id="btn-cancelar-pac">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-guardar-pac">
                            ${esEdicion ? 'Guardar cambios' : 'Registrar paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>`;

    document.getElementById('btn-volver-pac').addEventListener('click', () => { window.location.hash = '#/pacientes'; });
    document.getElementById('btn-cancelar-pac').addEventListener('click', () => { window.location.hash = '#/pacientes'; });

    document.getElementById('form-paciente').addEventListener('submit', async e => {
        e.preventDefault();
        await guardar(esEdicion ? pacienteId : null);
    });
}

async function guardar(pacienteId) {
    const get = id => document.getElementById(id)?.value?.trim() || null;

    const nombre = get('pac-nombre');
    const apellido = get('pac-apellido');

    // Validación local
    let valid = true;
    if (!nombre) { UI.setFieldError('pac-nombre', 'El nombre es obligatorio.'); valid = false; }
    if (!apellido) { UI.setFieldError('pac-apellido', 'El apellido es obligatorio.'); valid = false; }
    if (!valid) return;

    const body = {
        nombre,
        apellido,
        cedula: get('pac-cedula'),
        fechaNacimiento: get('pac-nacimiento'),
        sexo: get('pac-sexo'),
        tipoSangre: get('pac-sangre'),
        email: get('pac-email'),
        telefono: get('pac-telefono'),
        telefonoEmergencia: get('pac-tel-emergencia'),
        direccion: get('pac-direccion'),
    };

    const btn = document.getElementById('btn-guardar-pac');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    UI.showLoader();
    const res = pacienteId
        ? await Api.put(`/api/pacientes/${pacienteId}`, body)
        : await Api.post('/api/pacientes', body);
    UI.hideLoader();

    btn.disabled = false;
    btn.textContent = pacienteId ? 'Guardar cambios' : 'Registrar paciente';

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    window.location.hash = `#/pacientes/${res.datos.id}/expediente`;
}
