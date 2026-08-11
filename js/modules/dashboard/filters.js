// ============================================================
// dashboard/filters.js — Filtros de periodo, fecha y sucursal
// ============================================================

import State from '../../core/state.js';
import Sucursal from '../../core/sucursal.js';

export function crearFiltrosHTML(hoy) {
    const usuario = State.getUsuario();
    const esAdmin = usuario?.rol === 'administrador';
    const sucursales = Sucursal.getSucursales();
    const miSuc = usuario?.sucursalId;

    // Filtro de sucursal propio del dashboard:
    // - Admin: dropdown con todas las sucursales (por defecto la suya).
    // - Otros: su sucursal fija como texto.
    let filtroSucursal = '';
    if (esAdmin && sucursales.length) {
        const ops = sucursales.map(s =>
            `<option value="${s.id}" ${s.id === miSuc ? 'selected' : ''}>${s.nombre}</option>`).join('');
        filtroSucursal = `
            <div style="display:flex;align-items:center;gap:var(--sp-2)">
                <span class="text-sm text-muted">Sucursal:</span>
                <select class="form-control" id="dash-sucursal"
                    style="width:auto;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-sm)">
                    ${ops}
                </select>
            </div>`;
    }

    return `
        <div class="card mb-4">
            <div class="card-body" style="padding:var(--sp-3) var(--sp-4)">
                <div style="display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap">
                    <div style="display:flex;gap:2px;background:var(--color-bg);border-radius:var(--radius);padding:2px">
                        <button class="btn btn-sm periodo-btn active" data-periodo="dia">Día</button>
                        <button class="btn btn-sm periodo-btn" data-periodo="semana">Semana</button>
                        <button class="btn btn-sm periodo-btn" data-periodo="mes">Mes</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--sp-2)">
                        <button class="btn btn-ghost btn-sm" id="btn-fecha-prev" title="Anterior">◀</button>
                        <input type="date" class="form-control" id="input-fecha-dash"
                            value="${hoy}" style="width:170px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-sm)" />
                        <button class="btn btn-ghost btn-sm" id="btn-fecha-next" title="Siguiente">▶</button>
                    </div>
                    <button class="btn btn-ghost btn-sm" id="btn-hoy" style="font-weight:500">Hoy</button>
                    ${filtroSucursal}
                    <span class="text-sm text-muted" id="label-sucursal-dash" style="margin-left:auto"></span>
                    <button class="btn btn-ghost btn-sm" id="btn-refresh-dash">↻</button>
                </div>
            </div>
        </div>`;
}

export function bindFiltros(container, state, onCambio) {
    // Periodo buttons
    container.querySelectorAll('.periodo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.periodo-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = '';
                b.style.color = '';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--color-primary)';
            btn.style.color = '#fff';
            state.periodo = btn.dataset.periodo;
            onCambio();
        });
        if (btn.dataset.periodo === state.periodo) {
            btn.style.background = 'var(--color-primary)';
            btn.style.color = '#fff';
        }
    });

    document.getElementById('input-fecha-dash').addEventListener('change', e => {
        state.fecha = e.target.value;
        onCambio();
    });

    document.getElementById('btn-fecha-prev').addEventListener('click', () => {
        moverFecha(state, -1);
        onCambio();
    });

    document.getElementById('btn-fecha-next').addEventListener('click', () => {
        moverFecha(state, 1);
        onCambio();
    });

    document.getElementById('btn-hoy').addEventListener('click', () => {
        state.fecha = new Date().toISOString().split('T')[0];
        document.getElementById('input-fecha-dash').value = state.fecha;
        onCambio();
    });

    document.getElementById('btn-refresh-dash')?.addEventListener('click', onCambio);

    // Filtro de sucursal propio del dashboard (solo admin tiene el dropdown)
    const selSuc = document.getElementById('dash-sucursal');
    if (selSuc) {
        // Inicializar el estado con la sucursal por defecto
        state.sucursalId = parseInt(selSuc.value);
        selSuc.addEventListener('change', () => {
            state.sucursalId = selSuc.value ? parseInt(selSuc.value) : null;
            onCambio();
        });
    }
}

function moverFecha(state, dir) {
    const fecha = new Date(state.fecha + 'T12:00:00');
    const paso = state.periodo === 'mes' ? 30 : state.periodo === 'semana' ? 7 : 1;
    fecha.setDate(fecha.getDate() + (dir * paso));
    state.fecha = fecha.toISOString().split('T')[0];
    document.getElementById('input-fecha-dash').value = state.fecha;
}

export function calcularRango(state) {
    const base = new Date(state.fecha + 'T12:00:00');
    let inicio, fin, desc;

    if (state.periodo === 'semana') {
        const d = ((base.getDay() + 6) % 7);
        inicio = new Date(base); inicio.setDate(base.getDate() - d);
        fin = new Date(inicio); fin.setDate(inicio.getDate() + 6);
        const fmt = d => d.toLocaleDateString('es-NI', { day: 'numeric', month: 'short', timeZone: 'America/Managua' });
        desc = `Semana del ${fmt(inicio)} al ${fmt(fin)}`;
    } else if (state.periodo === 'mes') {
        inicio = new Date(base.getFullYear(), base.getMonth(), 1);
        fin = new Date(base.getFullYear(), base.getMonth() + 1, 0);
        desc = inicio.toLocaleDateString('es-NI', { year: 'numeric', month: 'long', timeZone: 'America/Managua' });
    } else {
        inicio = base; fin = base;
        const hoy = new Date().toISOString().split('T')[0];
        desc = state.fecha === hoy
            ? `Hoy, ${base.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Managua' })}`
            : base.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Managua' });
    }

    return { inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0], desc };
}
