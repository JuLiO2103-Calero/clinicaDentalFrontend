// pagos/pendientes.js — Citas listas para cobrar (carga bajo demanda)

import Api      from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';
import { abrirModal } from './modal-cobro.js';

let _citasCache = [];  // cache local para filtrar sin volver al servidor

export async function cargarPendientes() {
    const suc = Sucursal.getSucursalFiltro();

    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/citas', { sucursalId: suc }));
    UI.hideLoader();

    // Solo citas completadas o en curso que NO estén pagadas
    _citasCache = (res.ok ? res.datos : []).filter(c =>
        ['completada', 'en_curso'].includes(c.estado) && !c.pagado
    );

    _pintar(_citasCache);
}

export function filtrarPendientesLocal() {
    const q = (document.getElementById('cobro-buscar')?.value || '').toLowerCase().trim();
    if (!q) { _pintar(_citasCache); return; }
    const filtradas = _citasCache.filter(c =>
        (c.paciente ?? '').toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
    _pintar(filtradas);
}

function _pintar(citas) {
    document.getElementById('citas-cobro-count').textContent = `${citas.length} cita(s)`;
    const container = document.getElementById('citas-cobro');

    if (!citas.length) {
        container.innerHTML = '<div class="empty-state" style="padding:var(--sp-6)"><p class="text-muted">No hay citas pendientes de cobro</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper" style="border:none"><table class="table"><thead><tr>
            <th>Cita</th><th>Fecha</th><th>Paciente</th><th>Servicio</th>
            <th>Precio</th><th>Doctor</th><th>Estado</th><th></th>
        </tr></thead><tbody>${citas.map(c => `<tr>
            <td>#${c.id}</td>
            <td style="white-space:nowrap">${UI.fechaHora(c.fechaHora)}</td>
            <td class="font-semibold">${c.paciente}</td>
            <td>${c.servicio ?? '—'}</td>
            <td class="font-semibold">${c.precioServicio != null ? UI.moneda(c.precioServicio) : '—'}</td>
            <td>${c.doctor}</td>
            <td>${UI.badge(c.estado)}</td>
            <td><button class="btn btn-primary btn-sm btn-cobrar" data-id="${c.id}"
                data-precio="${c.precioServicio ?? 0}"
                data-paciente="${c.paciente}"
                data-servicio="${c.servicio ?? 'Sin servicio'}"
                data-fecha="${UI.fechaHora(c.fechaHora)}">
                💳 Cobrar
            </button></td>
        </tr>`).join('')}</tbody></table></div>`;

    container.querySelectorAll('.btn-cobrar').forEach(btn => {
        btn.addEventListener('click', () => abrirModal(btn.dataset));
    });
}
