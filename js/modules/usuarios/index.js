// usuarios/index.js — Orquestador del módulo Usuarios (solo admin)

import Api   from '../../core/api.js';
import State from '../../core/state.js';
import UI    from '../../utils/ui.js';

import { cargarLista }                                          from './lista.js';
import { cargarCatalogos, crearModalHTML, bindModal, abrirNuevo, abrirEditar } from './formulario.js';

const UsuariosModule = {
    async render(container) {
        // Solo admin
        if (State.getUsuario()?.rol !== 'administrador') {
            container.innerHTML = `<div class="card"><div class="card-body text-center" style="padding:3rem">
                <p class="text-muted">Acceso restringido a administradores.</p></div></div>`;
            return;
        }

        await cargarCatalogos();

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Usuarios</h1>
                    <p class="page-subtitle">Gestión de usuarios del sistema</p>
                </div>
                <button class="btn btn-primary" id="btn-nuevo-usuario">+ Nuevo usuario</button>
            </div>
            <div class="card">
                <div id="usuarios-tabla"><div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div></div>
            </div>
            ${crearModalHTML()}`;

        const refresh = () => this._recargar();

        bindModal(refresh);
        document.getElementById('btn-nuevo-usuario').addEventListener('click', abrirNuevo);

        this._recargar();
    },

    _recargar() {
        cargarLista(
            abrirEditar,                          // onEditar
            this._cambiarEstado.bind(this),       // onEstado
            this._desbloquear.bind(this),         // onDesbloquear
            this._reiniciarPassword.bind(this)    // onReiniciarPassword
        );
    },

    _cambiarEstado(id, activoActual) {
        const accion = activoActual ? 'desactivar' : 'activar';
        UI.confirm(`¿Deseas ${accion} este usuario?`, async () => {
            UI.showLoader();
            const res = await Api.put(`/api/usuarios/${id}/estado`, { activo: !activoActual });
            UI.hideLoader();
            if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
            UI.toast(`Usuario ${accion === 'desactivar' ? 'desactivado' : 'activado'}`, 'success');
            this._recargar();
        });
    },

    _desbloquear(id) {
        UI.confirm('¿Desbloquear este usuario? Se reiniciarán sus intentos fallidos.', async () => {
            UI.showLoader();
            const res = await Api.put(`/api/usuarios/${id}/desbloquear`, {});
            UI.hideLoader();
            if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
            UI.toast('Usuario desbloqueado', 'success');
            this._recargar();
        });
    },

    _reiniciarPassword(id, nombreUsuario) {
        UI.confirm(
            `¿Reiniciar la contraseña de "${nombreUsuario}"? Se generará una contraseña temporal ` +
            `y el usuario deberá cambiarla al iniciar sesión.`,
            async () => {
                UI.showLoader();
                const res = await Api.post(`/api/usuarios/${id}/reiniciar-password`, {});
                UI.hideLoader();
                if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
                this._mostrarPasswordTemporal(nombreUsuario, res.datos);
                this._recargar();
            },
            'Reiniciar contraseña'
        );
    },

    // Muestra la contraseña temporal UNA VEZ, con botón para copiarla.
    // No queda guardada en ningún lado del frontend tras cerrar el modal.
    _mostrarPasswordTemporal(nombreUsuario, passwordTemporal) {
        const id = 'modal-pass-temporal';
        document.getElementById(id)?.remove();

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width:420px">
                <div class="modal-header">
                    <h3 class="modal-title">Contraseña reiniciada</h3>
                    <button class="modal-close" id="btn-close-pass-temp">×</button>
                </div>
                <div class="modal-body">
                    <p class="text-sm text-muted">
                        Comparte esta contraseña temporal con <strong>${nombreUsuario}</strong>
                        por un medio seguro. Solo se muestra una vez; deberá cambiarla
                        al iniciar sesión.
                    </p>
                    <div style="display:flex;gap:var(--sp-2);align-items:center;margin-top:var(--sp-3)">
                        <input type="text" class="form-control" id="input-pass-temp"
                            value="${passwordTemporal}" readonly
                            style="font-family:monospace;font-size:var(--fs-lg);text-align:center;font-weight:600" />
                        <button class="btn btn-outline btn-sm" id="btn-copiar-pass-temp">📋 Copiar</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="btn-cerrar-pass-temp">Listo</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        UI.openModal(id);

        const cerrar = () => { UI.closeModal(id); modal.remove(); };
        document.getElementById('btn-close-pass-temp').addEventListener('click', cerrar);
        document.getElementById('btn-cerrar-pass-temp').addEventListener('click', cerrar);
        document.getElementById('btn-copiar-pass-temp').addEventListener('click', () => {
            const input = document.getElementById('input-pass-temp');
            input.select();
            navigator.clipboard?.writeText(passwordTemporal);
            UI.toast('Contraseña copiada', 'success');
        });
    },

    destroy() {}
};

export default UsuariosModule;
