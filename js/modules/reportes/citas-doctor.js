// reportes/citas-doctor.js — Vista detallada de citas de un doctor
// Se abre desde el reporte de citas al hacer clic en un doctor.

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';
import { descargarExcel, descargarPDF } from './exportar.js';

let _citas = [];
let _doctor = '';

export async function renderCitasDoctor(container, doctorId, doctorNombre, fechaInicio, fechaFin) {
    _doctor = doctorNombre || `Doctor #${doctorId}`;

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Citas de ${_doctor}</h1>
                <p class="page-subtitle">${fechaInicio} a ${fechaFin}</p>
            </div>
            <button class="btn btn-ghost" id="btn-volver-cd">← Volver a reportes</button>
        </div>
        <div class="card"><div class="card-body" id="cd-contenido">
            <div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div>
        </div></div>`;

    document.getElementById('btn-volver-cd').addEventListener('click', () => { window.location.hash = '#/reportes'; });

    const params = { doctorId, fechaInicio, fechaFin };
    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/citas', params));
    UI.hideLoader();

    _citas = res.ok ? res.datos : [];
    _pintar();
}

function _pintar() {
    const cont = document.getElementById('cd-contenido');
    if (!_citas.length) {
        cont.innerHTML = '<p class="text-muted text-center" style="padding:var(--sp-4)">Este doctor no tiene citas en el rango seleccionado</p>';
        return;
    }

    const completadas = _citas.filter(c => c.estado === 'completada').length;
    const canceladas = _citas.filter(c => c.estado === 'cancelada').length;

    cont.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-4)">
            <div style="display:flex;gap:var(--sp-4);font-size:var(--fs-sm)">
                <span><strong>${_citas.length}</strong> citas</span>
                <span style="color:var(--color-success)"><strong>${completadas}</strong> completadas</span>
                <span style="color:var(--color-danger)"><strong>${canceladas}</strong> canceladas</span>
            </div>
            <div style="display:flex;gap:var(--sp-2)">
                <button class="btn btn-outline btn-sm" id="cd-excel">📊 Excel</button>
                <button class="btn btn-outline btn-sm" id="cd-pdf">📄 PDF</button>
            </div>
        </div>
        <div class="table-wrapper"><table class="table"><thead><tr>
            <th>Cita ID</th><th>Fecha y hora</th><th>Paciente</th><th>Servicio</th>
            <th>Estado</th><th>Duración</th><th>Sucursal</th><th>Motivo</th><th>Pagado</th>
        </tr></thead><tbody>${_citas.map(c => `<tr>
            <td class="font-semibold">#${c.id}</td>
            <td style="white-space:nowrap">${UI.fechaHora(c.fechaHora)}</td>
            <td>${c.paciente}</td>
            <td>${c.servicio ?? '—'}</td>
            <td>${UI.badge(c.estado)}</td>
            <td>${c.duracionMin} min</td>
            <td>${c.sucursal ?? '—'}</td>
            <td class="text-sm">${c.motivo ?? '—'}</td>
            <td>${c.pagado ? '✅' : '—'}</td>
        </tr>`).join('')}</tbody></table></div>`;

    document.getElementById('cd-excel').addEventListener('click', _exportarExcel);
    document.getElementById('cd-pdf').addEventListener('click', _exportarPDF);
}

function _datosParaExportar() {
    const columnas = ['Cita ID', 'Fecha y hora', 'Paciente', 'Servicio', 'Estado', 'Duración (min)', 'Sucursal', 'Motivo', 'Pagado'];
    const filas = _citas.map(c => [
        c.id,
        UI.fechaHora(c.fechaHora),
        c.paciente,
        c.servicio ?? '',
        c.estado,
        c.duracionMin,
        c.sucursal ?? '',
        c.motivo ?? '',
        c.pagado ? 'Sí' : 'No'
    ]);
    return { columnas, filas };
}

function _exportarExcel() {
    const { columnas, filas } = _datosParaExportar();
    descargarExcel(`citas_${_doctor.replace(/\s+/g, '_')}`, columnas, filas);
}

function _exportarPDF() {
    const { columnas, filas } = _datosParaExportar();
    descargarPDF(`Citas de ${_doctor}`, `${_citas.length} citas`, columnas, filas);
}
