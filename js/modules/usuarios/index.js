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
            abrirEditar,                      // onEditar
            this._cambiarEstado.bind(this),   // onEstado
            this._desbloquear.bind(this)      // onDesbloquear
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

    destroy() {}
};

export default UsuariosModule;
