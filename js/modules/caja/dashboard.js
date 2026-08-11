// caja/dashboard.js — Dashboard de caja
// Las tarjetas superiores muestran SOLO la caja del usuario (apertura actual):
// saldo, efectivo por moneda (C$/US$), neto del día y total de pagos.
// Los totales tienen botón para alternar entre córdobas y dólares.

import Api from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import UI from '../../utils/ui.js';
import { getTasa } from './catalogo.js';
import { htmlMiCaja, bindMiCajaEvents, htmlAbrirCaja, bindAbrirEvents } from './mi-caja.js';
import { crearHistorialHTML, bindHistorial } from './historial.js';

// Estado de conversión de cada tarjeta: 'NIO' o 'USD'
let _monedaSaldo = 'NIO';
let _monedaNeto = 'NIO';
let _monedaNoEfe = 'NIO';

export async function renderDashboard(content, onRefresh) {
    const suc = Sucursal.getSucursalFiltro();

    UI.showLoader();
    const [resAb, resMi, resMon] = await Promise.all([
        Api.get(Api.buildUrl('/api/caja/abiertas', { sucursalId: suc })),
        Api.get('/api/caja/mi-caja'),                      // mi caja (sin filtro global)
        Api.get('/api/caja/resumen-moneda')                // resumen de MI apertura
    ]);
    UI.hideLoader();

    const abiertas = resAb.ok ? resAb.datos : [];
    const miCaja = resMi.ok ? resMi.datos : null;
    const m = resMon.ok ? resMon.datos : {};

    // Tasa para conversiones (venta: C$ por US$1)
    const tasa = getTasa();
    const tasaVenta = tasa?.tasaVenta ?? 36.80;

    const saldoNIO = m.saldoCaja ?? 0;
    const efeCordobas = m.efectivoCordobas ?? 0;
    const efeDolares = m.efectivoDolares ?? 0;
    const netoNIO = m.netoHoyNIO ?? 0;
    const noEfeNIO = m.totalNoEfectivo ?? 0;

    // Helper de conversión y formato
    const fmt = (valorNIO, moneda) => moneda === 'USD'
        ? `$${(valorNIO / tasaVenta).toFixed(2)}`
        : UI.moneda(valorNIO);

    content.innerHTML = `
        <div class="caja-cards mb-4" style="display:flex;flex-wrap:wrap;gap:var(--sp-4)">
            <div class="stat-card caja-card" style="cursor:pointer" id="card-saldo" title="Clic para cambiar moneda">
                <div class="stat-card-label">Saldo caja ${_monedaSaldo === 'USD' ? '(US$)' : '(C$)'} 🔄</div>
                <div class="stat-card-value">${fmt(saldoNIO, _monedaSaldo)}</div>
            </div>

            <div class="stat-card caja-card">
                <div class="stat-card-label">En córdobas</div>
                <div class="stat-card-value success">${UI.moneda(efeCordobas)}</div>
            </div>

            <div class="stat-card caja-card">
                <div class="stat-card-label">En dólares</div>
                <div class="stat-card-value">$${efeDolares.toFixed(2)}</div>
            </div>

            <div class="stat-card caja-card" style="cursor:pointer" id="card-noefe" title="Clic para cambiar moneda">
                <div class="stat-card-label">No efectivo ${_monedaNoEfe === 'USD' ? '(US$)' : '(C$)'} 🔄</div>
                <div class="stat-card-value">${fmt(noEfeNIO, _monedaNoEfe)}</div>
            </div>

            <div class="stat-card caja-card" style="cursor:pointer" id="card-neto" title="Clic para cambiar moneda">
                <div class="stat-card-label">Neto hoy ${_monedaNeto === 'USD' ? '(US$)' : '(C$)'} 🔄</div>
                <div class="stat-card-value success">${fmt(netoNIO, _monedaNeto)}</div>
            </div>

            <div class="stat-card caja-card">
                <div class="stat-card-label">Pagos</div>
                <div class="stat-card-value">${m.totalPagos ?? 0}</div>
            </div>
        </div>
        <style>
            .caja-cards .caja-card {
                flex: 1 1 auto;
                min-width: max-content;
                white-space: nowrap;
            }
        </style>

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
            (() => {
                const porSuc = {};
                abiertas.forEach(a => { if (!porSuc[a.sucursal]) porSuc[a.sucursal] = []; porSuc[a.sucursal].push(a); });
                return Object.entries(porSuc).map(([nom, cajas]) => `
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
                            <td style="color:${mv.tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)'}">${mv.tipo === 'ingreso' ? '+' : '−'}${UI.moneda(mv.monto)}</td><td>${mv.usuario}</td></tr>`).join('')}
                        </tbody></table></div></details>` : ''}
                </div>`).join('')}</div>`).join('');
            })()}

        ${crearHistorialHTML()}`;

    // Botones de conversión de moneda (alternan y repintan)
    document.getElementById('card-saldo')?.addEventListener('click', () => {
        _monedaSaldo = _monedaSaldo === 'NIO' ? 'USD' : 'NIO';
        renderDashboard(content, onRefresh);
    });
    document.getElementById('card-neto')?.addEventListener('click', () => {
        _monedaNeto = _monedaNeto === 'NIO' ? 'USD' : 'NIO';
        renderDashboard(content, onRefresh);
    });
    document.getElementById('card-noefe')?.addEventListener('click', () => {
        _monedaNoEfe = _monedaNoEfe === 'NIO' ? 'USD' : 'NIO';
        renderDashboard(content, onRefresh);
    });

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