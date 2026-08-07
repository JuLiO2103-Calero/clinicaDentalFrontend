// usuarios/formulario.js — Modal crear/editar usuario

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';

let _roles = [], _sucursales = [], _onGuardado = null;

export async function cargarCatalogos() {
    const [resR, resS] = await Promise.all([
        Api.get('/api/roles'),
        Api.get('/api/sucursales')
    ]);
    _roles = resR.ok ? resR.datos : [];
    _sucursales = resS.ok ? resS.datos : [];
}

export function crearModalHTML() {
    return `<div id="modal-usuario" class="modal-overlay hidden">
        <div class="modal"><div class="modal-header">
            <h3 class="modal-title" id="modal-u-titulo">Nuevo usuario</h3>
            <button class="modal-close" id="btn-close-u">×</button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="u-id" />
            <div class="form-group mb-3 hidden" id="g-username-view">
                <label class="form-label">Nombre de usuario</label>
                <input type="text" class="form-control" id="u-username-view" readonly style="background:var(--color-bg)" />
                <span class="form-hint">Generado por el sistema, no se puede cambiar</span>
            </div>
            <div class="form-row mb-3">
                <div class="form-group"><label class="form-label">Primer nombre <span class="required">*</span></label>
                    <input type="text" class="form-control" id="u-primer-nombre" /></div>
                <div class="form-group"><label class="form-label">Segundo nombre</label>
                    <input type="text" class="form-control" id="u-segundo-nombre" /></div>
            </div>
            <div class="form-row mb-3">
                <div class="form-group"><label class="form-label">Primer apellido <span class="required">*</span></label>
                    <input type="text" class="form-control" id="u-primer-apellido" /></div>
                <div class="form-group"><label class="form-label">Segundo apellido</label>
                    <input type="text" class="form-control" id="u-segundo-apellido" /></div>
            </div>
            <div class="form-group mb-3"><label class="form-label">Correo (opcional)</label>
                <input type="email" class="form-control" id="u-email" /></div>
            <div class="form-group mb-3"><label class="form-label">Teléfono</label>
                <input type="text" class="form-control" id="u-telefono" placeholder="8888-8888" />
                <span class="form-hint">Necesario para recuperar contraseña por SMS</span></div>
            <div class="form-row mb-3">
                <div class="form-group"><label class="form-label">Rol <span class="required">*</span></label>
                    <select class="form-control" id="u-rol"></select></div>
                <div class="form-group"><label class="form-label">Sucursal</label>
                    <select class="form-control" id="u-sucursal"></select>
                    <span class="form-hint">Vacío = todas (admin)</span></div>
            </div>
            <div class="form-group mb-3" id="g-password">
                <label class="form-label">Contraseña <span class="required">*</span></label>
                <input type="password" class="form-control" id="u-password" />
                <span class="form-hint">Mínimo 8 caracteres</span>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-ghost" id="btn-cancel-u">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-u">Guardar</button>
        </div></div></div>`;
}

export function bindModal(onGuardado) {
    _onGuardado = onGuardado;
    document.getElementById('btn-close-u')?.addEventListener('click', () => UI.closeModal('modal-usuario'));
    document.getElementById('btn-cancel-u')?.addEventListener('click', () => UI.closeModal('modal-usuario'));
    document.getElementById('btn-save-u')?.addEventListener('click', guardar);
}

function llenarSelects() {
    document.getElementById('u-rol').innerHTML =
        '<option value="">Seleccionar...</option>' +
        _roles.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
    document.getElementById('u-sucursal').innerHTML =
        '<option value="">Todas las sucursales</option>' +
        _sucursales.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
}

export function abrirNuevo() {
    llenarSelects();
    document.getElementById('modal-u-titulo').textContent = 'Nuevo usuario';
    document.getElementById('u-id').value = '';
    ['u-primer-nombre','u-segundo-nombre','u-primer-apellido','u-segundo-apellido','u-email','u-telefono','u-password'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('u-rol').value = '';
    document.getElementById('u-sucursal').value = '';
    document.getElementById('g-password').classList.remove('hidden');
    document.getElementById('g-username-view').classList.add('hidden');
    UI.openModal('modal-usuario');
}

export async function abrirEditar(id) {
    llenarSelects();
    UI.showLoader();
    const res = await Api.get(`/api/usuarios/${id}`);
    UI.hideLoader();
    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    const u = res.datos;

    document.getElementById('modal-u-titulo').textContent = 'Editar usuario';
    document.getElementById('u-id').value = u.id;
    document.getElementById('u-username-view').value = u.nombreUsuario;
    document.getElementById('g-username-view').classList.remove('hidden');
    document.getElementById('u-primer-nombre').value = u.primerNombre ?? '';
    document.getElementById('u-segundo-nombre').value = u.segundoNombre ?? '';
    document.getElementById('u-primer-apellido').value = u.primerApellido ?? '';
    document.getElementById('u-segundo-apellido').value = u.segundoApellido ?? '';
    document.getElementById('u-email').value = u.email ?? '';
    document.getElementById('u-telefono').value = u.telefono ?? '';
    document.getElementById('u-rol').value = u.rolId;
    document.getElementById('u-sucursal').value = u.sucursalId ?? '';
    document.getElementById('g-password').classList.add('hidden');
    UI.openModal('modal-usuario');
}

async function guardar() {
    const id = document.getElementById('u-id').value;
    const esNuevo = !id;

    const body = {
        primerNombre: document.getElementById('u-primer-nombre').value.trim(),
        segundoNombre: document.getElementById('u-segundo-nombre').value.trim() || null,
        primerApellido: document.getElementById('u-primer-apellido').value.trim(),
        segundoApellido: document.getElementById('u-segundo-apellido').value.trim() || null,
        email: document.getElementById('u-email').value.trim() || null,
        telefono: document.getElementById('u-telefono').value.trim() || null,
        rolId: parseInt(document.getElementById('u-rol').value) || 0,
        sucursalId: document.getElementById('u-sucursal').value ? parseInt(document.getElementById('u-sucursal').value) : null
    };

    if (!body.primerNombre || !body.primerApellido || !body.rolId) {
        UI.toast('Completa los campos obligatorios (primer nombre, primer apellido y rol)', 'warning'); return;
    }

    if (esNuevo) {
        const pass = document.getElementById('u-password').value;
        if (pass.length < 8) { UI.toast('La contraseña debe tener al menos 8 caracteres', 'warning'); return; }
        body.password = pass;
    }

    const btn = document.getElementById('btn-save-u');
    btn.disabled = true; btn.textContent = 'Guardando…';
    UI.showLoader();
    const res = esNuevo
        ? await Api.post('/api/usuarios', body)
        : await Api.put(`/api/usuarios/${id}`, body);
    UI.hideLoader();
    btn.disabled = false; btn.textContent = 'Guardar';

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    // El mensaje del backend incluye el nombre de usuario generado
    UI.toast(esNuevo ? (res.mensaje || 'Usuario creado') : 'Usuario actualizado', 'success');
    UI.closeModal('modal-usuario');
    if (_onGuardado) _onGuardado();
}
