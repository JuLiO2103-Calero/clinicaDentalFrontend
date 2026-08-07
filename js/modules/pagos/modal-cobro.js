// pagos/modal-cobro.js — Costo + Descuento + Total, pago multi-moneda, vuelto manual
// Reglas:
//   Total a cobrar = Costo del servicio - Descuento
//   Caja sube por el valor real de la venta (Total a cobrar) solo en efectivo.

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';

let _tasa = null, _metodos = null, _citaPago = null, _onPagoRegistrado = null;

export function setDatos(tasa, metodos) { _tasa = tasa; _metodos = metodos; }

// Abre el modal de pago desde cualquier módulo (ej: detalle de cita).
// Carga catálogos e inyecta el DOM del modal si no existe.
export async function abrirPagoDirecto(citaData, onRegistrado) {
    if (!_tasa || !_metodos) {
        const [resMet, resTasa] = await Promise.all([
            Api.get('/api/pagos/metodos'),
            Api.get('/api/tasas-cambio/activa')
        ]);
        _metodos = resMet.ok ? resMet.datos : [];
        _tasa    = resTasa.ok ? resTasa.datos : null;
    }
    if (!document.getElementById('modal-pago')) {
        const wrap = document.createElement('div');
        wrap.innerHTML = crearModalHTML();
        document.body.appendChild(wrap.firstElementChild);
        bindModal(onRegistrado);
    } else {
        _onPagoRegistrado = onRegistrado;
    }
    abrirModal(citaData);
}

function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

export function crearModalHTML() {
    return `<div id="modal-pago" class="modal-overlay hidden">
        <div class="modal modal-lg"><div class="modal-header">
            <h3 class="modal-title">Registrar pago</h3>
            <button class="modal-close" id="btn-close-pago">×</button>
        </div><div class="modal-body" id="modal-pago-body"></div>
        <div class="modal-footer">
            <button class="btn btn-ghost" id="btn-cancel-pago">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-pago">💳 Cobrar</button>
        </div></div></div>`;
}

export function bindModal(onRegistrado) {
    _onPagoRegistrado = onRegistrado;
    document.getElementById('btn-close-pago')?.addEventListener('click', () => UI.closeModal('modal-pago'));
    document.getElementById('btn-cancel-pago')?.addEventListener('click', () => UI.closeModal('modal-pago'));
    document.getElementById('btn-save-pago')?.addEventListener('click', ejecutarPago);
}

export function abrirModal(data) {
    _citaPago = data;
    const costoNIO = parseFloat(data.precio) || 0;   // precio del servicio en córdobas
    const opsMet = _metodos.map(m => `<option value="${m.id}" data-nombre="${m.nombre}">${m.nombre}</option>`).join('');

    document.getElementById('modal-pago-body').innerHTML = `
        <div style="background:var(--color-bg);padding:var(--sp-3);border-radius:var(--radius);margin-bottom:var(--sp-4)">
            <div class="font-semibold">${data.paciente}</div>
            <div class="text-sm text-muted">Cita #${data.id} · ${data.servicio} · ${data.fecha}</div>
        </div>

        <!-- 1. Costo, descuento y total -->
        <div class="form-row mb-3">
            <div class="form-group"><label class="form-label">Costo del servicio (C$)</label>
                <input type="number" class="form-control" id="p-costo" min="0.01" step="0.01" value="${costoNIO.toFixed(2)}" /></div>
            <div class="form-group"><label class="form-label">Descuento (C$)</label>
                <input type="number" class="form-control" id="p-desc" min="0" step="0.01" value="0" /></div>
        </div>
        <div style="background:#eef6ff;border-radius:var(--radius);padding:var(--sp-3);margin-bottom:var(--sp-4);text-align:right">
            <span class="text-sm text-muted">Total a cobrar:</span>
            <span id="p-total-label" style="font-size:var(--fs-xl);font-weight:700;color:var(--color-primary);margin-left:var(--sp-2)"></span>
            <span id="p-total-usd" class="text-sm text-muted"></span>
        </div>

        <!-- 2. Método -->
        <div class="form-group mb-4">
            <label class="form-label">Método de pago</label>
            <select class="form-control" id="p-metodo" style="max-width:260px">${opsMet}</select>
        </div>

        <!-- 4. Tipo de efectivo -->
        <div class="form-group mb-4 hidden" id="g-tipo-efectivo">
            <label class="form-label">El cliente paga con</label>
            <select class="form-control" id="p-moneda" style="max-width:260px">
                <option value="NIO">Solo córdobas (C$)</option>
                <option value="USD">Solo dólares ($)</option>
                <option value="MIX">Mixto (C$ + $)</option>
            </select>
        </div>

        <div id="g-efectivo">
            <div class="form-row mb-4">
                <div class="form-group" id="g-nio"><label class="form-label">Recibido en córdobas (C$)</label>
                    <input type="number" class="form-control" id="p-nio" min="0" step="0.01" value="0" /></div>
                <div class="form-group hidden" id="g-usd"><label class="form-label">Recibido en dólares ($)</label>
                    <input type="number" class="form-control" id="p-usd" min="0" step="0.01" value="0" /></div>
            </div>
            <div id="p-resumen" style="background:var(--color-bg);padding:var(--sp-4);border-radius:var(--radius)"></div>
            <div id="p-alertas" style="margin-top:var(--sp-3)"></div>

            <div id="g-vuelto" class="hidden" style="margin-top:var(--sp-3);padding:var(--sp-4);border:2px solid #a3cfbb;border-radius:var(--radius);background:#f0f9f4">
                <h4 style="font-size:var(--fs-base);font-weight:600;margin-bottom:var(--sp-3)">💰 Vuelto entregado al cliente</h4>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Monto del vuelto</label>
                        <input type="number" class="form-control" id="p-vuelto" min="0" step="0.01" value="0" /></div>
                    <div class="form-group"><label class="form-label">Moneda del vuelto</label>
                        <select class="form-control" id="p-moneda-vuelto">
                            <option value="">Sin vuelto</option>
                            <option value="NIO">Córdobas (C$)</option>
                            <option value="USD">Dólares ($)</option>
                        </select></div>
                </div>
                <p class="text-xs text-muted mt-2" id="p-vuelto-sugerido"></p>
                <div id="p-vuelto-alerta" style="margin-top:var(--sp-2)"></div>
            </div>
        </div>

        <div id="g-no-efectivo" class="hidden" style="padding:var(--sp-4);background:#e7f1ff;border-radius:var(--radius);font-size:var(--fs-sm)">
            <span id="p-nota-no-efectivo"></span>
        </div>

        <!-- Nota / observación (opcional) -->
        <div class="form-group mt-4">
            <label class="form-label">Nota / observación (opcional)</label>
            <textarea class="form-control" id="p-observacion" rows="2" placeholder="Ej: pago parcial, acuerdo especial, referencia de transferencia..."></textarea>
        </div>`;

    // Bind
    document.getElementById('p-costo').addEventListener('input', onCambioMonto);
    document.getElementById('p-desc').addEventListener('input', onCambioMonto);
    document.getElementById('p-metodo').addEventListener('change', onCambioMetodo);
    document.getElementById('p-moneda').addEventListener('change', onCambioMoneda);
    ['p-nio', 'p-usd'].forEach(id => document.getElementById(id)?.addEventListener('input', calcular));
    document.getElementById('p-vuelto').addEventListener('input', () => {
        const v = parseFloat(document.getElementById('p-vuelto').value) || 0;
        if (v > 0 && document.getElementById('p-moneda-vuelto').value === '')
            document.getElementById('p-moneda-vuelto').value = 'NIO';
        validarVuelto();
    });
    document.getElementById('p-moneda-vuelto').addEventListener('change', validarVuelto);

    onCambioMonto();
    onCambioMetodo();
    UI.openModal('modal-pago');
}

// Total a cobrar = costo - descuento
function getTotal() {
    const costo = parseFloat(document.getElementById('p-costo').value) || 0;
    let desc = parseFloat(document.getElementById('p-desc').value) || 0;
    if (desc < 0) desc = 0;
    if (desc > costo) desc = costo;
    return r2(costo - desc);
}

function onCambioMonto() {
    // Validar descuento
    const costo = parseFloat(document.getElementById('p-costo').value) || 0;
    const descEl = document.getElementById('p-desc');
    let desc = parseFloat(descEl.value) || 0;
    if (desc < 0) { desc = 0; descEl.value = 0; }
    if (desc > costo) { desc = costo; descEl.value = costo.toFixed(2); }

    const total = getTotal();
    const tC = _tasa?.tasaCompra ?? 36.50;
    document.getElementById('p-total-label').textContent = UI.moneda(total);
    document.getElementById('p-total-usd').textContent = ` (= $${r2(total / tC).toFixed(2)})`;

    // Re-sincronizar el recibido con el nuevo total
    if (esMetodoEfectivo()) onCambioMoneda();
}

function esMetodoEfectivo() {
    const sel = document.getElementById('p-metodo');
    return (sel.options[sel.selectedIndex]?.dataset?.nombre ?? '').toLowerCase().includes('efectivo');
}

function onCambioMetodo() {
    const sel = document.getElementById('p-metodo');
    const nombre = (sel.options[sel.selectedIndex]?.dataset?.nombre ?? '').toLowerCase();
    const efectivo = nombre.includes('efectivo');

    document.getElementById('g-tipo-efectivo').classList.toggle('hidden', !efectivo);
    document.getElementById('g-efectivo').classList.toggle('hidden', !efectivo);
    document.getElementById('g-no-efectivo').classList.toggle('hidden', efectivo);

    if (!efectivo) {
        const nota = document.getElementById('p-nota-no-efectivo');
        nota.innerHTML = nombre.includes('transferencia')
            ? '🏦 <strong>Transferencia</strong> — se registra el pago pero NO aumenta el efectivo en caja.'
            : '💳 <strong>Pago con tarjeta (POS)</strong> — se registra el pago pero NO aumenta el efectivo en caja.';
    } else {
        onCambioMoneda();
    }
}

function onCambioMoneda() {
    const tipo = document.getElementById('p-moneda').value;
    document.getElementById('g-nio').classList.toggle('hidden', tipo === 'USD');
    document.getElementById('g-usd').classList.toggle('hidden', tipo === 'NIO');

    const total = getTotal();
    const tC = _tasa?.tasaCompra ?? 36.50;
    if (tipo === 'NIO') {
        document.getElementById('p-nio').value = total.toFixed(2);
        document.getElementById('p-usd').value = 0;
    } else if (tipo === 'USD') {
        document.getElementById('p-usd').value = r2(total / tC).toFixed(2);
        document.getElementById('p-nio').value = 0;
    }
    calcular();
}

function calcular() {
    if (!esMetodoEfectivo()) return;

    const total = getTotal();
    const tipo  = document.getElementById('p-moneda').value;
    const nio   = parseFloat(document.getElementById('p-nio').value) || 0;
    const usd   = parseFloat(document.getElementById('p-usd').value) || 0;
    const tC    = _tasa?.tasaCompra ?? 36.50;
    const tV    = _tasa?.tasaVenta ?? 36.80;

    const recibidoNIO = tipo === 'NIO' ? nio : tipo === 'USD' ? r2(usd * tC) : r2(nio + (usd * tC));
    const cambioNIO = r2(recibidoNIO - total);

    document.getElementById('p-resumen').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
            <div>
                <div class="text-sm font-semibold text-muted mb-2">Recibido:</div>
                ${tipo === 'NIO' ? `<div class="text-sm">${UI.moneda(nio)}</div>` : ''}
                ${tipo === 'USD' ? `<div class="text-sm">$${usd.toFixed(2)} × C$${tC} = ${UI.moneda(r2(usd * tC))}</div>` : ''}
                ${tipo === 'MIX' ? `<div class="text-sm">${UI.moneda(nio)} + $${usd.toFixed(2)} (=${UI.moneda(r2(usd * tC))})</div>` : ''}
                <div class="font-semibold mt-2">Total recibido: ${UI.moneda(recibidoNIO)}</div>
            </div>
            <div style="text-align:right">
                <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-primary)">A cobrar: ${UI.moneda(total)}</div>
                <div style="font-size:var(--fs-lg);font-weight:700;margin-top:var(--sp-2);color:${cambioNIO >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
                    Cambio: ${UI.moneda(Math.abs(cambioNIO))}
                </div>
                ${cambioNIO > 0 ? `<div class="text-xs text-muted">= $${r2(cambioNIO / tV).toFixed(2)} en dólares</div>` : ''}
            </div>
        </div>`;

    const alertas = [];
    const panelVuelto = document.getElementById('g-vuelto');
    if (cambioNIO < -0.01) {
        alertas.push(`<div style="background:#f8d7da;color:#58151c;padding:var(--sp-2) var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
            ❌ El monto recibido es insuficiente. Faltan <strong>${UI.moneda(Math.abs(cambioNIO))}</strong></div>`);
        panelVuelto.classList.add('hidden');
    } else if (cambioNIO > 0.01) {
        alertas.push(`<div style="background:#d1e7dd;color:#0a3622;padding:var(--sp-2) var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
            ✅ Debe devolver <strong>${UI.moneda(cambioNIO)}</strong> (= $${r2(cambioNIO / tV).toFixed(2)})</div>`);
        panelVuelto.classList.remove('hidden');
        document.getElementById('p-vuelto-sugerido').innerHTML = `💡 Sugerido: C$${cambioNIO.toFixed(2)} o $${r2(cambioNIO / tV).toFixed(2)}`;
        validarVuelto();
    } else {
        panelVuelto.classList.add('hidden');
    }
    document.getElementById('p-alertas').innerHTML = alertas.join('');
}

// 3. Validar cambio entregado vs calculado
function validarVuelto() {
    const total = getTotal();
    const tipo  = document.getElementById('p-moneda').value;
    const nio   = parseFloat(document.getElementById('p-nio').value) || 0;
    const usd   = parseFloat(document.getElementById('p-usd').value) || 0;
    const tC    = _tasa?.tasaCompra ?? 36.50;
    const tV    = _tasa?.tasaVenta ?? 36.80;

    const recibidoNIO = tipo === 'NIO' ? nio : tipo === 'USD' ? r2(usd * tC) : r2(nio + (usd * tC));
    const cambioCalcNIO = r2(recibidoNIO - total);

    const vuelto = parseFloat(document.getElementById('p-vuelto').value) || 0;
    const monVuelto = document.getElementById('p-moneda-vuelto').value;
    const vueltoNIO = monVuelto === 'USD' ? r2(vuelto * tV) : vuelto;

    const alertaEl = document.getElementById('p-vuelto-alerta');
    const exceso = r2(vueltoNIO - cambioCalcNIO);

    if (exceso > 0.50) {
        alertaEl.innerHTML = `<div style="background:#fff3cd;color:#664d03;padding:var(--sp-2) var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
            ⚠️ Está entregando más cambio del necesario. Está dando <strong>${UI.moneda(exceso)} de más</strong>. Revise el monto antes de continuar.</div>`;
    } else if (exceso < -0.50) {
        alertaEl.innerHTML = `<div style="background:#fff3cd;color:#664d03;padding:var(--sp-2) var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
            ⚠️ Está entregando <strong>${UI.moneda(Math.abs(exceso))} de menos</strong> del cambio calculado.</div>`;
    } else {
        alertaEl.innerHTML = '';
    }
}

async function ejecutarPago() {
    const costo  = parseFloat(document.getElementById('p-costo').value) || 0;
    let desc     = parseFloat(document.getElementById('p-desc').value) || 0;
    if (desc < 0) desc = 0;
    if (desc > costo) desc = costo;
    const total  = r2(costo - desc);
    const esEfec = esMetodoEfectivo();
    const metodo = parseInt(document.getElementById('p-metodo').value);
    const tC     = _tasa?.tasaCompra ?? 36.50;

    if (total <= 0) { UI.toast('El total a cobrar debe ser mayor a cero', 'warning'); return; }

    // monto = costo, descuento = desc  ->  backend: totalCobrado = costo - desc = total a cobrar
    let body = {
        citaId: parseInt(_citaPago.id),
        metodoPagoId: metodo,
        monto: costo,
        descuento: desc,
        tasaCambioAplicada: tC,
        monedaPrincipal: 'NIO',
        notas: document.getElementById('p-observacion')?.value?.trim() || null
    };

    if (esEfec) {
        const tipo = document.getElementById('p-moneda').value;
        const nio  = parseFloat(document.getElementById('p-nio').value) || 0;
        const usd  = parseFloat(document.getElementById('p-usd').value) || 0;
        const recibidoNIO = tipo === 'NIO' ? nio : tipo === 'USD' ? r2(usd * tC) : r2(nio + (usd * tC));
        const cambioNIO = r2(recibidoNIO - total);

        if (cambioNIO < -0.01) { UI.toast('El monto recibido no cubre el total del pago.', 'error'); return; }

        const vuelto = parseFloat(document.getElementById('p-vuelto').value) || 0;
        const monVuelto = document.getElementById('p-moneda-vuelto').value || null;

        body.monedaPrincipal  = tipo;
        body.montoCordobas    = tipo === 'USD' ? 0 : nio;
        body.montoDolares     = tipo === 'NIO' ? 0 : usd;
        body.efectivoRecibido = recibidoNIO;
        body.cambioDevuelto   = (vuelto > 0 && monVuelto) ? vuelto : null;
        body.monedaCambio     = (vuelto > 0 && monVuelto) ? monVuelto : null;
    }

    const btn = document.getElementById('btn-save-pago');
    btn.disabled = true; btn.textContent = 'Procesando…';
    UI.showLoader();
    const res = await Api.post('/api/pagos', body);
    UI.hideLoader();
    btn.disabled = false; btn.textContent = '💳 Cobrar';

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast('Pago registrado correctamente', 'success');
    UI.closeModal('modal-pago');
    if (_onPagoRegistrado) _onPagoRegistrado();
}
