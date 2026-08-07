// caja/mi-caja.js — Vista de la caja del usuario actual

import Api      from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';

export function htmlMiCaja(c) {
    return `
        <div class="card mb-4" style="border-left:4px solid var(--color-primary)">
            <div class="card-header"><h2 class="card-title">🔑 Mi caja abierta</h2></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)">
                    <div><span class="text-xs text-muted">Inicial</span><div class="font-semibold">${UI.moneda(c.montoInicial)}</div></div>
                    <div><span class="text-xs text-muted">Saldo actual</span><div class="font-semibold" style="color:var(--color-primary);font-size:var(--fs-lg)">${UI.moneda(c.saldoActual)}</div></div>
                    <div><span class="text-xs text-muted">Movimientos</span><div class="font-semibold">${c.movimientos.length}</div></div>
                    <div><span class="text-xs text-muted">Abierta</span><div class="text-sm">${UI.fechaHora(c.fechaApertura)}</div></div>
                </div>
                <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" id="btn-nuevo-pago-caja">💳 Registrar pago</button>
                    <button class="btn btn-outline btn-sm" id="btn-mov">+ Movimiento</button>
                    <button class="btn btn-danger btn-sm" id="btn-cerrar">Cerrar mi caja</button>
                </div>
                <div id="form-mov" class="hidden mt-4" style="padding:var(--sp-3);background:var(--color-bg);border-radius:var(--radius)">
                    <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:flex-end">
                        <div class="form-group"><label class="form-label">Tipo</label>
                            <select class="form-control" id="mov-tipo"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
                        <div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Concepto</label>
                            <input type="text" class="form-control" id="mov-concepto" /></div>
                        <div class="form-group" style="width:120px"><label class="form-label">Monto</label>
                            <input type="number" class="form-control" id="mov-monto" min="0.01" step="0.01" /></div>
                        <button class="btn btn-primary btn-sm" id="btn-save-mov" style="height:36px">Registrar</button>
                    </div>
                </div>
                ${c.movimientos.length ? `
                <div class="table-wrapper mt-4"><table class="table"><thead><tr>
                    <th>Hora</th><th>Tipo</th><th>Método</th><th>Concepto</th><th>Monto</th></tr></thead>
                    <tbody>${c.movimientos.map(m => `<tr class="mov-row" data-mov='${JSON.stringify(m).replace(/'/g, "&#39;")}' style="cursor:pointer;transition:background var(--transition)">
                        <td>${UI.fechaHora(m.fecha)}</td><td>${UI.badge(m.tipo)}</td>
                        <td class="text-sm">${m.metodoPago ?? 'Manual'}</td>
                        <td>${m.concepto}</td>
                        <td class="font-semibold" style="color:${m.tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)'}">${m.tipo === 'ingreso' ? '+' : '−'}${UI.moneda(m.monto)}</td>
                    </tr>`).join('')}
                    </tbody></table></div>` : '<p class="text-sm text-muted mt-3">Sin movimientos aún</p>'}
            </div>
        </div>
        <!-- Modal detalle movimiento -->
        <div id="modal-mov-detalle" class="modal-overlay hidden">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Detalle del movimiento</h3>
                    <button class="modal-close" id="btn-close-mov-det">×</button>
                </div>
                <div class="modal-body" id="mov-det-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cerrar-mov-det">Cerrar</button>
                </div>
            </div>
        </div>`;
}

export function bindMiCajaEvents(onRefresh) {
    document.getElementById('btn-mov')?.addEventListener('click', () => {
        document.getElementById('form-mov')?.classList.toggle('hidden');
    });

    // Modal detalle movimiento
    document.getElementById('btn-close-mov-det')?.addEventListener('click', () => UI.closeModal('modal-mov-detalle'));
    document.getElementById('btn-cerrar-mov-det')?.addEventListener('click', () => UI.closeModal('modal-mov-detalle'));
    document.querySelectorAll('.mov-row').forEach(row => {
        row.addEventListener('mouseenter', () => row.style.background = 'var(--color-bg)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => {
            const m = JSON.parse(row.dataset.mov);
            const fila = (l, v) => `<div style="display:flex;gap:var(--sp-3);padding:var(--sp-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm)"><span class="text-muted" style="min-width:130px">${l}</span><span>${v}</span></div>`;
            document.getElementById('mov-det-body').innerHTML = `
                ${fila('Fecha', UI.fechaHora(m.fecha))}
                ${fila('Tipo', UI.badge(m.tipo))}
                ${fila('Método de pago', m.metodoPago ?? 'Movimiento manual')}
                ${fila('Concepto', m.concepto)}
                ${fila('Monto', `<strong style="color:${m.tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)'}">
                    ${m.tipo === 'ingreso' ? '+' : '−'}${UI.moneda(m.monto)}</strong>`)}
                ${fila('Usuario', m.usuario)}
                ${m.pagoId ? fila('Pago #', m.pagoId) : ''}`;
            UI.openModal('modal-mov-detalle');
        });
    });

    document.getElementById('btn-save-mov')?.addEventListener('click', async () => {
        const concepto = document.getElementById('mov-concepto').value.trim();
        const monto = parseFloat(document.getElementById('mov-monto').value);
        if (!concepto || !monto) { UI.toast('Concepto y monto obligatorios', 'warning'); return; }
        UI.showLoader();
        const r = await Api.post('/api/caja/movimiento', {
            sucursalId: Sucursal.getSucursalFiltro(),
            tipo: document.getElementById('mov-tipo').value, concepto, monto
        });
        UI.hideLoader();
        if (!r.ok) { UI.toast(r.mensaje, 'error'); return; }
        UI.toast(r.mensaje, 'success');
        onRefresh();
    });

    document.getElementById('btn-cerrar')?.addEventListener('click', async () => {
        const suc = Sucursal.getSucursalFiltro();
        const resMi = await Api.get(Api.buildUrl('/api/caja/mi-caja', { sucursalId: suc }));
        if (!resMi.ok) { UI.toast(resMi.mensaje, 'error'); return; }
        UI.confirm(`¿Cerrar tu caja?\nSaldo: ${UI.moneda(resMi.datos.saldoActual)}`, async () => {
            UI.showLoader();
            const r = await Api.post(Api.buildUrl('/api/caja/cerrar', { sucursalId: suc }),
                { efectivoContado: resMi.datos.saldoActual, observaciones: null });
            UI.hideLoader();
            if (!r.ok) { UI.toast(r.mensaje, 'error'); return; }
            UI.toast('Caja cerrada', 'success');
            onRefresh();
        });
    });
}

export function htmlAbrirCaja(otrasAbiertas) {
    return `
        <div class="card"><div class="card-body" style="padding:var(--sp-6);text-align:center">
            <div style="font-size:2rem;margin-bottom:var(--sp-3)">🏧</div>
            <p class="font-semibold mb-2">No tienes caja abierta</p>
            ${otrasAbiertas.length ? `<div class="text-sm text-muted mb-4" style="background:var(--color-bg);padding:var(--sp-3);border-radius:var(--radius)">
                ⚠️ ${otrasAbiertas.length} caja(s) abierta(s) por: ${otrasAbiertas.map(a => `<strong>${a.abiertoPorNombre}</strong>`).join(', ')}</div>` : ''}
            <button class="btn btn-primary" id="btn-abrir-caja">Abrir mi caja</button>
            <div id="form-abrir" class="hidden" style="margin-top:var(--sp-4);max-width:300px;margin-left:auto;margin-right:auto">
                <div class="form-group mb-3"><label class="form-label">Monto inicial</label>
                    <input type="number" class="form-control" id="caja-monto-ini" value="0" min="0" step="0.01" /></div>
                <button class="btn btn-primary w-full" id="btn-confirmar-abrir">Confirmar apertura</button>
            </div>
        </div></div>`;
}

export function bindAbrirEvents(onRefresh) {
    document.getElementById('btn-abrir-caja')?.addEventListener('click', () => {
        document.getElementById('form-abrir')?.classList.toggle('hidden');
    });
    document.getElementById('btn-confirmar-abrir')?.addEventListener('click', async () => {
        const monto = parseFloat(document.getElementById('caja-monto-ini').value) || 0;
        UI.showLoader();
        // La caja se abre en la sucursal del usuario (la resuelve el backend).
        // El filtro de arriba es solo para reportes, NO influye aquí.
        const r = await Api.post('/api/caja/abrir', { montoInicial: monto, observaciones: null });
        UI.hideLoader();
        if (!r.ok) { UI.toast(r.mensaje, 'error'); return; }
        UI.toast('Caja abierta', 'success');
        onRefresh();
    });
}
