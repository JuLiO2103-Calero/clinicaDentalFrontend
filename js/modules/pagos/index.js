// pagos/index.js — Orquestador del módulo de pagos

import Api from '../../core/api.js';

import { setDatos, crearModalHTML, bindModal } from './modal-cobro.js';
import { cargarPendientes, filtrarPendientesLocal } from './pendientes.js';
import { cargarHistorial }                      from './historial.js';

const PagosModule = {
    _onSucChange: null,

    async render(container) {
        // Cargar catálogos
        const [resMet, resTasa] = await Promise.all([
            Api.get('/api/pagos/metodos'),
            Api.get('/api/tasas-cambio/activa')
        ]);
        const metodos = resMet.ok  ? resMet.datos  : [];
        const tasa    = resTasa.ok ? resTasa.datos  : null;
        setDatos(tasa, metodos);

        const hoy  = new Date().toISOString().split('T')[0];
        const mesI = hoy.slice(0, 8) + '01';

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Pagos</h1>
                    <p class="page-subtitle">Registro de cobros</p>
                </div>
                <div class="text-sm" style="background:var(--color-bg);padding:var(--sp-2) var(--sp-3);border-radius:var(--radius)">
                    💱 ${tasa ? `Compra <strong>C$${tasa.tasaCompra}</strong> · Venta <strong>C$${tasa.tasaVenta}</strong>` : 'Sin tasa'}
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h2 class="card-title" style="font-size:var(--fs-base)">💳 Citas listas para cobrar</h2>
                    <div style="display:flex;gap:var(--sp-2);align-items:center">
                        <span class="text-sm text-muted" id="citas-cobro-count"></span>
                        <input type="text" class="form-control" id="cobro-buscar" placeholder="Filtrar por paciente..." style="width:180px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                        <button class="btn btn-primary btn-sm" id="btn-cargar-cobro">🔄 Cargar</button>
                    </div>
                </div>
                <div id="citas-cobro">
                    <div class="empty-state" style="padding:var(--sp-6)">
                        <p class="text-muted">Presiona <strong>Cargar</strong> para ver las citas pendientes de cobro</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" style="font-size:var(--fs-base)">Historial de pagos</h2>
                    <div style="display:flex;gap:var(--sp-2);align-items:center;flex-wrap:wrap">
                        <label class="text-xs text-muted">Desde</label>
                        <input type="date" class="form-control" id="pg-ini" value="${mesI}" style="width:135px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                        <label class="text-xs text-muted">Hasta</label>
                        <input type="date" class="form-control" id="pg-fin" value="${hoy}" style="width:135px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                        <button class="btn btn-primary btn-sm" id="btn-filtrar-pg">🔍 Buscar</button>
                    </div>
                </div>
                <div id="tabla-pagos">
                    <div class="empty-state" style="padding:var(--sp-6)">
                        <p class="text-muted">Elige un rango de fechas y presiona <strong>Buscar</strong></p>
                    </div>
                </div>
            </div>

            ${crearModalHTML()}`;

        // Tras cobrar: recargar pendientes siempre; el historial solo si ya se había buscado
        const refresh = () => {
            cargarPendientes();
            const yaBuscado = !document.querySelector('#tabla-pagos .empty-state');
            if (yaBuscado) cargarHistorial(refresh);
        };

        bindModal(refresh);
        document.getElementById('btn-cargar-cobro').addEventListener('click', () => cargarPendientes());
        document.getElementById('cobro-buscar').addEventListener('input', filtrarPendientesLocal);
        document.getElementById('btn-filtrar-pg').addEventListener('click', () => cargarHistorial(refresh));

        // NO auto-cargamos: el usuario decide cuándo cargar (rendimiento)
        this._onSucChange = () => {
            // Al cambiar sucursal, solo recargar si ya había datos visibles
            if (!document.querySelector('#citas-cobro .empty-state')) cargarPendientes();
        };
        window.addEventListener('sucursal-changed', this._onSucChange);
    },

    destroy() {
        if (this._onSucChange) { window.removeEventListener('sucursal-changed', this._onSucChange); this._onSucChange = null; }
    }
};

export default PagosModule;
