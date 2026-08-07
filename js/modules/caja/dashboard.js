// caja/dashboard.js — Dashboard de caja del admin

import Api      from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';
import { htmlMiCaja, bindMiCajaEvents, htmlAbrirCaja, bindAbrirEvents } from './mi-caja.js';
import { crearHistorialHTML, bindHistorial } from './historial.js';

export async function renderDashboard(content, onRefresh) {
    const suc = Sucursal.getSucursalFiltro();

    UI.showLoader();
    const [resAb, resMi, resMon] = await Promise.all([
        Api.get(Api.buildUrl('/api/caja/abiertas', { sucursalId: suc })),
        Api.get(Api.buildUrl('/api/caja/mi-caja', { sucursalId: suc })),
        Api.get(Api.buildUrl('/api/caja/resumen-moneda', { sucursalId: suc }))
    ]);
    UI.hideLoader();

    const abiertas = resAb.ok ? resAb.datos : [];
    const miCaja   = resMi.ok ? resMi.datos : null;
    const m        = resMon.ok ? resMon.datos : {};

    const porSuc = {};
    abiertas.forEach(a => { if (!porSuc[a.sucursal]) porSuc[a.sucursal] = []; porSuc[a.sucursal].push(a); });
    const totalSaldo = abiertas.reduce((s, a) => s + a.saldoActual, 0);

    content.innerHTML = `
        <div class="stats-grid mb-4">
            <div class="stat-card"><div class="stat-card-label">Cajas abiertas</div><div class="stat-card-value primary">${abiertas.length}</div></div>
            <div class="stat-card"><div class="stat-card-label">Saldo cajas</div><div class="stat-card-value">${UI.moneda(totalSaldo)}</div></div>
            <div class="stat-card"><div class="stat-card-label">En córdobas</div><div class="stat-card-value success">${UI.moneda(m.totalCordobas ?? 0)}</div></div>
            <div class="stat-card"><div class="stat-card-label">En dólares</div><div class="stat-card-value">$${(m.totalDolares ?? 0).toFixed(2)}</div></div>
            <div class="stat-card"><div class="stat-card-label">Neto hoy</div><div class="stat-card-value success">${UI.moneda(m.totalNetoNIO ?? 0)}</div></div>
            <div class="stat-card"><div class="stat-card-label">Pagos</div><div class="stat-card-value">${m.pagosActivos ?? 0} <span class="text-xs" style="font-weight:400">(${m.pagosAnulados ?? 0} anul.)</span></div></div>
        </div>

        ${miCaja ? htmlMiCaja(miCaja) : `
        <div class="card mb-4"><div class="card-body" style="padding:var(--sp-4);display:flex;gap:var(--sp-3);align-items:center">
            <button class="btn btn-primary" id="btn-abrir-caja">+ Abrir mi caja</button>
            <div id="form-abrir" class="hidden" style="display:flex;gap:var(--sp-3);align-items:flex-end">
                <div class="form-group"><label class="form-label">Monto inicial</label><input type="number" class="form-control" id="caja-monto-ini" value="0" min="0" step="0.01" /></div>
                <button class="btn btn-primary btn-sm" id="btn-confirmar-abrir" style="height:36px">Abrir</button>
            </div>
        </div></div>`}

        <h2 style="font-size:var(--fs-lg);font-weight:600;margin-bottom:var(--sp-4)">Cajas abiertas</h2>
        ${!abiertas.length ? '<div class="card mb-4"><div class="empty-state"><p class="text-muted">Sin cajas abiertas</p></div></div>' :
        Object.entries(porSuc).map(([nom, cajas]) => `
            <div class="card mb-4"><div class="card-header"><h2 class="card-title">📍 ${nom} (${cajas.length})</h2></div>
            ${cajas.map(a => `<div style="padding:var(--sp-4);border-bottom:1px solid var(--color-border)">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-2)">
                    <span class="font-semibold">${a.abiertoPorNombre}</span>
                    <div style="display:flex;gap:var(--sp-4);align-items:center;font-size:var(--fs-sm)">
                        <span>Inicial: ${UI.moneda(a.montoInicial)}</span>
                        <span style="color:var(--color-primary);font-weight:600">Saldo: ${UI.moneda(a.saldoActual)}</span>
                        <span class="text-muted">${a.movimientos.length} mov.</span>
                    </div>
                </div>
                ${a.movimientos.length ? `<details style="font-size:var(--fs-sm);margin-top:var(--sp-2)"><summary style="cursor:pointer;color:var(--color-primary);font-weight:500">Ver movimientos</summary>
                    <div class="table-wrapper mt-2"><table class="table"><thead><tr><th>Hora</th><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Usuario</th></tr></thead>
                    <tbody>${a.movimientos.map(mv => `<tr><td>${UI.fechaHora(mv.fecha)}</td><td>${UI.badge(mv.tipo)}</td><td>${mv.concepto}</td>
                        <td style="color:${mv.tipo==='ingreso'?'var(--color-success)':'var(--color-danger)'}">${mv.tipo==='ingreso'?'+':'−'}${UI.moneda(mv.monto)}</td><td>${mv.usuario}</td></tr>`).join('')}
                    </tbody></table></div></details>` : ''}
            </div>`).join('')}</div>`).join('')}

        ${crearHistorialHTML()}`;

    // Bind
    bindHistorial();
    if (miCaja) {
        bindMiCajaEvents(onRefresh);
        document.getElementById('btn-nuevo-pago-caja')?.addEventListener('click', () => {
            window.location.hash = '#/pagos';
        });
    } else {
        bindAbrirEvents(onRefresh);
    }
}
