// caja/index.js — Orquestador del módulo de caja

import State    from '../../core/state.js';
import Sucursal from '../../core/sucursal.js';
import Api      from '../../core/api.js';
import UI       from '../../utils/ui.js';

import { cargarCatalogos, tasaHTML }                             from './catalogo.js';
import { crearModalTasaHTML, bindModalTasa }                     from './modal-tasa.js';
import { renderDashboard }                                       from './dashboard.js';
import { htmlMiCaja, bindMiCajaEvents, htmlAbrirCaja, bindAbrirEvents } from './mi-caja.js';
import { crearHistorialHTML, bindHistorial }                     from './historial.js';

const CajaModule = {
    _container: null,
    _onSucChange: null,

    async render(container) {
        this._container = container;
        const rol = State.getUsuario()?.rol;

        await cargarCatalogos();

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Caja</h1>
                    <p class="page-subtitle" id="caja-sucursal">📍 ${Sucursal.getSucursalNombre()}</p>
                </div>
                <div style="display:flex;gap:var(--sp-3);align-items:center">
                    <div class="text-sm" style="background:var(--color-bg);padding:var(--sp-2) var(--sp-3);border-radius:var(--radius)">${tasaHTML()}</div>
                    ${rol === 'administrador' ? `<button class="btn btn-outline btn-sm" id="btn-config-tasa">⚙️ Tasa</button>` : ''}
                </div>
            </div>
            <div id="caja-content"></div>
            ${rol === 'administrador' ? crearModalTasaHTML() : ''}`;

        if (rol === 'administrador') {
            bindModalTasa(() => this.render(container));
        }

        this._cargar();

        this._onSucChange = () => this._cargar();
        window.addEventListener('sucursal-changed', this._onSucChange);
    },

    async _cargar() {
        const rol     = State.getUsuario()?.rol;
        const content = document.getElementById('caja-content');
        const refresh = () => this.render(this._container);

        document.getElementById('caja-sucursal').textContent = '📍 ' + Sucursal.getSucursalNombre();

        if (rol === 'administrador') {
            await renderDashboard(content, refresh);
        } else {
            await this._cargarMiCajaVista(content, refresh);
        }
    },

    async _cargarMiCajaVista(content, onRefresh) {
        const suc = Sucursal.getSucursalFiltro();
        UI.showLoader();
        const [resMi, resAb] = await Promise.all([
            Api.get(Api.buildUrl('/api/caja/mi-caja', { sucursalId: suc })),
            Api.get(Api.buildUrl('/api/caja/abiertas', { sucursalId: suc }))
        ]);
        UI.hideLoader();

        const miCaja = resMi.ok ? resMi.datos : null;
        const otras  = (resAb.ok ? resAb.datos : []).filter(a => a.abiertoPor !== State.getUsuario()?.id);

        if (!miCaja) {
            content.innerHTML = htmlAbrirCaja(otras) + crearHistorialHTML();
            bindAbrirEvents(onRefresh);
            bindHistorial();
        } else {
            content.innerHTML = htmlMiCaja(miCaja) + crearHistorialHTML();
            bindMiCajaEvents(onRefresh);
            bindHistorial();
            document.getElementById('btn-nuevo-pago-caja')?.addEventListener('click', () => {
                window.location.hash = '#/pagos';
            });
        }
    },

    destroy() {
        if (this._onSucChange) { window.removeEventListener('sucursal-changed', this._onSucChange); this._onSucChange = null; }
    }
};

export default CajaModule;
