// pagos/historial.js — Tabla de pagos con filtro por fecha y anulación (admin)

import Api      from '../../core/api.js';
import State    from '../../core/state.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';

// ¿La fecha del pago es hoy? (zona horaria Managua)
function esHoy(fechaPago) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
    const fp  = new Date(fechaPago).toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
    return hoy === fp;
}

export async function cargarHistorial(onRefresh) {
    const inicio = document.getElementById('pg-ini')?.value || null;
    const fin    = document.getElementById('pg-fin')?.value || null;
    const suc    = Sucursal.getSucursalFiltro();
    const rol    = State.getUsuario()?.rol;

    if (!inicio || !fin) { UI.toast('Selecciona el rango de fechas', 'warning'); return; }
    if (inicio > fin)    { UI.toast('La fecha inicial no puede ser mayor a la final', 'warning'); return; }

    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/pagos', { fechaInicio: inicio, fechaFin: fin, sucursalId: suc }));
    UI.hideLoader();

    const pagos = res.ok ? res.datos : [];
    const container = document.getElementById('tabla-pagos');

    if (!pagos.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💳</div><p class="empty-state-text">Sin pagos en este periodo</p></div>';
        return;
    }

    const limiteAviso = pagos.length >= 500
        ? '<div style="padding:var(--sp-2) var(--sp-4);background:#fff3cd;color:#664d03;font-size:var(--fs-sm)">⚠️ Se muestran los primeros 500 registros. Acota el rango de fechas para ver más.</div>'
        : '';

    const totalCobrado = pagos.filter(p => !p.anulado).reduce((s, p) => s + p.totalCobrado, 0);

    container.innerHTML = limiteAviso + `
        <div style="padding:var(--sp-3) var(--sp-4);background:var(--color-bg);font-size:var(--fs-sm)">
            <strong>${pagos.length}</strong> pago(s) · Total: <strong style="color:var(--color-success)">${UI.moneda(totalCobrado)}</strong>
            · Anulados: <strong style="color:var(--color-danger)">${pagos.filter(p => p.anulado).length}</strong>
        </div>
        <div class="table-wrapper" style="border:none"><table class="table"><thead><tr>
            <th>Fecha</th><th>Paciente</th><th>Monto</th><th>Desc.</th><th>Total</th>
            <th>Método</th><th>Recibido por</th><th>Estado</th>
            ${rol === 'administrador' ? '<th>Acción</th>' : ''}
        </tr></thead><tbody>${pagos.map(p => `
            <tr style="${p.anulado ? 'opacity:0.5' : ''}">
                <td style="white-space:nowrap">${UI.fechaHora(p.fechaPago)}</td>
                <td class="font-semibold">${p.paciente ?? '—'}</td>
                <td>${UI.moneda(p.monto)}</td>
                <td>${p.descuento > 0 ? UI.moneda(p.descuento) : '—'}</td>
                <td class="font-semibold">${UI.moneda(p.totalCobrado)}</td>
                <td>${p.metodoPago}</td><td>${p.recibidoPor}</td>
                <td>${p.anulado ? UI.badge('cancelada') : UI.badge('completada')}</td>
                ${rol === 'administrador'
                    ? (p.anulado
                        ? '<td><span class="text-xs text-muted">Anulado</span></td>'
                        : (esHoy(p.fechaPago)
                            ? `<td><button class="btn btn-danger btn-sm btn-anular" data-id="${p.id}">🗑️ Anular</button></td>`
                            : '<td><span class="text-xs text-muted" title="Solo se puede anular el mismo día">—</span></td>'))
                    : ''}
            </tr>`).join('')}</tbody></table></div>`;

    container.querySelectorAll('.btn-anular').forEach(btn => {
        btn.addEventListener('click', () => {
            const motivo = prompt('Motivo de la anulación:');
            if (motivo === null) return;              // canceló
            if (!motivo.trim()) { UI.toast('Debes indicar un motivo', 'warning'); return; }
            UI.confirm('¿Anular este pago? Se generará un egreso en caja y la cita volverá a estar pendiente de cobro.', async () => {
                UI.showLoader();
                const r = await Api.put(`/api/pagos/${btn.dataset.id}/anular`, { motivo: motivo.trim() });
                UI.hideLoader();
                if (!r.ok) { UI.toast(r.mensaje, 'error'); return; }
                UI.toast(r.mensaje, 'success');
                if (onRefresh) onRefresh();
            });
        });
    });
}
