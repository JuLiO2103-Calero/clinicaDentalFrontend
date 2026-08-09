// ============================================================
// servicios/index.js — Catálogo de servicios (solo admin)
// CRUD: listar, crear, editar, activar/desactivar.
// ============================================================

import Api   from '../../core/api.js';
import State from '../../core/state.js';
import UI    from '../../utils/ui.js';

let _servicios = [];

const ServiciosModule = {
    async render(container) {
        if (State.getUsuario()?.rol !== 'administrador') {
            container.innerHTML = `<div class="card"><div class="card-body text-center" style="padding:3rem">
                <p class="text-muted">Acceso restringido a administradores.</p></div></div>`;
            return;
        }

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Servicios</h1>
                    <p class="page-subtitle">Catálogo de servicios de la clínica</p>
                </div>
                <button class="btn btn-primary" id="btn-nuevo-servicio">+ Nuevo servicio</button>
            </div>
            <div class="card">
                <div id="servicios-tabla"><div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div></div>
            </div>
            ${crearModalHTML()}`;

        bindModal(() => this._recargar());
        document.getElementById('btn-nuevo-servicio').addEventListener('click', () => abrirNuevo());

        this._recargar();
    },

    async _recargar() {
        // incluirInactivos=true: el admin ve todos (activos e inactivos)
        const res = await Api.get(Api.buildUrl('/api/servicios', { incluirInactivos: true }));
        _servicios = res.ok ? res.datos : [];
        pintarTabla(_servicios, this._cambiarEstado.bind(this));
    },

    async _cambiarEstado(id, activo) {
        const res = await Api.put(`/api/servicios/${id}/estado`, { activo });
        if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
        UI.toast(res.mensaje, 'success');
        this._recargar();
    },

    destroy() { _servicios = []; }
};

// ---------- Tabla ----------
function pintarTabla(servicios, onEstado) {
    const cont = document.getElementById('servicios-tabla');
    if (!cont) return;

    if (!servicios.length) {
        cont.innerHTML = '<div class="empty-state" style="padding:3rem"><p class="text-muted">No hay servicios registrados. Crea el primero.</p></div>';
        return;
    }

    cont.innerHTML = `
        <div class="table-wrapper"><table class="table"><thead><tr>
            <th>Nombre</th><th>Descripción</th><th>Precio base</th><th>Estado</th><th style="text-align:right">Acciones</th>
        </tr></thead><tbody>${servicios.map(s => `
            <tr style="${s.activo ? '' : 'opacity:.55'}">
                <td><strong>${s.nombre}</strong></td>
                <td class="text-sm text-muted">${s.descripcion ?? '—'}</td>
                <td>${UI.moneda(s.precioBase)}</td>
                <td><span class="badge badge-${s.activo ? 'completada' : 'inactivo'}">${s.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td style="text-align:right;white-space:nowrap">
                    <button class="btn btn-outline btn-sm btn-edit-serv" data-id="${s.id}">✏️ Editar</button>
                    <button class="btn btn-ghost btn-sm btn-estado-serv" data-id="${s.id}" data-activo="${s.activo}">
                        ${s.activo ? '🚫 Desactivar' : '✅ Activar'}
                    </button>
                </td>
            </tr>`).join('')}</tbody></table></div>`;

    cont.querySelectorAll('.btn-edit-serv').forEach(b =>
        b.addEventListener('click', () => abrirEditar(parseInt(b.dataset.id))));
    cont.querySelectorAll('.btn-estado-serv').forEach(b =>
        b.addEventListener('click', () => {
            const activo = b.dataset.activo === 'true';
            const accion = activo ? 'desactivar' : 'activar';
            UI.confirm(`¿Seguro que deseas ${accion} este servicio?`, () => onEstado(parseInt(b.dataset.id), !activo));
        }));
}

// ---------- Modal (crear / editar) ----------
function crearModalHTML() {
    return `
        <div class="modal-overlay" id="modal-servicio">
            <div class="modal" style="max-width:520px">
                <div class="modal-header">
                    <h3 id="modal-serv-titulo">Nuevo servicio</h3>
                    <button class="modal-close" id="btn-cerrar-serv">×</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="serv-id" />
                    <div class="form-group mb-4">
                        <label class="form-label">Nombre <span class="required">*</span></label>
                        <input type="text" class="form-control" id="serv-nombre" maxlength="150" placeholder="Ej. Limpieza dental" />
                        <span class="form-error" id="serv-nombre-error"></span>
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label">Descripción</label>
                        <textarea class="form-control" id="serv-descripcion" rows="2" placeholder="Opcional"></textarea>
                    </div>
                    <div class="form-row mb-4">
                        <div class="form-group">
                            <label class="form-label">Precio base (C$) <span class="required">*</span></label>
                            <input type="number" class="form-control" id="serv-precio" min="0" step="0.01" value="0" />
                            <span class="form-error" id="serv-precio-error"></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select class="form-control" id="serv-activo">
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cancelar-serv">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-serv">Guardar</button>
                </div>
            </div>
        </div>`;
}

let _onRefresh = null;

function bindModal(onRefresh) {
    _onRefresh = onRefresh;
    document.getElementById('btn-cerrar-serv').addEventListener('click', () => UI.closeModal('modal-servicio'));
    document.getElementById('btn-cancelar-serv').addEventListener('click', () => UI.closeModal('modal-servicio'));
    document.getElementById('btn-guardar-serv').addEventListener('click', guardar);
}

function abrirNuevo() {
    document.getElementById('modal-serv-titulo').textContent = 'Nuevo servicio';
    document.getElementById('serv-id').value = '';
    document.getElementById('serv-nombre').value = '';
    document.getElementById('serv-descripcion').value = '';
    document.getElementById('serv-precio').value = '0';
    document.getElementById('serv-activo').value = 'true';
    limpiarErrores();
    UI.openModal('modal-servicio');
}

function abrirEditar(id) {
    const s = _servicios.find(x => x.id === id);
    if (!s) return;
    document.getElementById('modal-serv-titulo').textContent = 'Editar servicio';
    document.getElementById('serv-id').value = s.id;
    document.getElementById('serv-nombre').value = s.nombre;
    document.getElementById('serv-descripcion').value = s.descripcion ?? '';
    document.getElementById('serv-precio').value = s.precioBase;
    document.getElementById('serv-activo').value = String(s.activo);
    limpiarErrores();
    UI.openModal('modal-servicio');
}

async function guardar() {
    limpiarErrores();
    const id = document.getElementById('serv-id').value;
    const nombre = document.getElementById('serv-nombre').value.trim();
    const descripcion = document.getElementById('serv-descripcion').value.trim() || null;
    const precioBase = parseFloat(document.getElementById('serv-precio').value);
    const activo = document.getElementById('serv-activo').value === 'true';

    let valid = true;
    if (!nombre) { setError('serv-nombre', 'El nombre es obligatorio.'); valid = false; }
    if (isNaN(precioBase) || precioBase < 0) { setError('serv-precio', 'Precio inválido.'); valid = false; }
    if (!valid) return;

    const body = { nombre, descripcion, precioBase, activo };
    const btn = document.getElementById('btn-guardar-serv');
    btn.disabled = true; btn.textContent = 'Guardando…';

    const res = id
        ? await Api.put(`/api/servicios/${id}`, body)
        : await Api.post('/api/servicios', body);

    btn.disabled = false; btn.textContent = 'Guardar';

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    UI.closeModal('modal-servicio');
    _onRefresh?.();
}

function setError(campo, msg) {
    const el = document.getElementById(`${campo}-error`);
    if (el) el.textContent = msg;
}
function limpiarErrores() {
    ['serv-nombre-error', 'serv-precio-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

export default ServiciosModule;
