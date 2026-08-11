// ============================================================
// dashboard/index.js — Orquestador del módulo Dashboard
// Importa y coordina: filters, stats, agenda, sidebar, calendario
// ============================================================
import Api      from '../../core/api.js';
import State    from '../../core/state.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';
import { crearFiltrosHTML, bindFiltros, calcularRango }         from './filters.js';
import { renderStats, renderEstados, crearModalHTML, bindModal, skeletonStats } from './stats.js';
import { renderAgenda }                                          from './agenda.js';
import { crearSidebarHTML, bindSidebar }                        from './sidebar.js';
import { crearCalendarioHTML, bindCalendario }                  from './calendario.js';
// Estado local del dashboard
const state = {
    fecha:   new Date().toISOString().split('T')[0],
    periodo: 'dia',
    citas:   [],
    sucursalId: null,   // filtro de sucursal propio del dashboard
};
let _refreshInterval = null;
const DashboardModule = {
    render(container) {
        const usuario = State.getUsuario();
        const rol     = usuario?.rol ?? '';
        const hora    = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Managua' }));
        const saludo  = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
        const hoy     = new Date().toISOString().split('T')[0];
        state.fecha   = hoy;
        state.periodo = 'dia';
        state.sucursalId = usuario?.sucursalId ?? null;
        state.citas   = [];
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">${saludo}, ${usuario?.nombre ?? 'Usuario'}</h1>
                    <p class="page-subtitle" id="desc-periodo"></p>
                </div>
                ${rol !== 'doctor' ? `
                <button class="btn btn-primary" id="btn-nueva-cita-dash">+ Nueva cita</button>` : ''}
            </div>
            ${crearFiltrosHTML(hoy)}
            <div class="stats-grid" id="stats-grid">${skeletonStats()}</div>
            <div style="display:grid;grid-template-columns:1fr 300px;gap:var(--sp-6);align-items:start">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title" id="titulo-agenda">Agenda</h2>
                        <span class="text-sm text-muted" id="contador-agenda"></span>
                    </div>
                    <div id="agenda-container">
                        <div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div>
                    </div>
                </div>
                ${crearSidebarHTML(rol)}
            </div>
            ${crearCalendarioHTML()}
            ${crearModalHTML()}`;
        // Bind sub-módulos
        bindFiltros(container, state, () => this.cargarDatos());
        bindSidebar(container);
        bindModal();
        bindCalendario();
        document.getElementById('btn-nueva-cita-dash')?.addEventListener('click', () => {
            window.location.hash = '#/citas/nueva';
        });
        // Carga inicial
        this.cargarDatos();
        // Auto-refresh
        _refreshInterval = setInterval(() => this.cargarDatos(), 120_000);
    },
    async cargarDatos() {
        const rango      = calcularRango(state);
        const sucursalId = state.sucursalId;   // filtro propio del dashboard
        document.getElementById('desc-periodo').textContent = rango.desc;
        const nombreSuc = Sucursal.getSucursales().find(s => s.id === state.sucursalId)?.nombre
            ?? 'Sin sucursal';
        document.getElementById('label-sucursal-dash').textContent = `📍 ${nombreSuc}`;
        const url = Api.buildUrl('/api/citas', {
            fechaInicio: rango.inicio,
            fechaFin:    rango.fin,
            sucursalId
        });
        const res = await Api.get(url);
        if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
        state.citas = res.datos ?? [];
        renderStats(state.citas, state.periodo);
        renderAgenda(state.citas, state.periodo);
        renderEstados(state.citas);
    },
    destroy() {
        if (_refreshInterval) { clearInterval(_refreshInterval); _refreshInterval = null; }
    }
};
export default DashboardModule;
