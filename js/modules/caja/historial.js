// caja/historial.js — Historial de cierres y aperturas con filtros

import Api from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import State from '../../core/state.js';
import UI from '../../utils/ui.js';

export function crearHistorialHTML() {
    const hoy = new Date().toISOString().split('T')[0];
    const mesI = hoy.slice(0, 8) + '01';
    const esAdmin = State.getUsuario()?.rol === 'administrador';

    // La pestaña "Cierres" usa un endpoint solo-admin; para otros roles
    // solo mostramos "Aperturas".
    const tabCierres = esAdmin
        ? `<button class="btn btn-sm hist-tab active" data-tipo="cierres" style="background:var(--color-primary);color:#fff">Cierres</button>`
        : '';
    const tabAperturasActiva = esAdmin ? '' : ' active';
    const tabAperturasStyle = esAdmin ? '' : ' style="background:var(--color-primary);color:#fff"';

    return `
        <div class="card mt-4">
            <div class="card-header">
                <h2 class="card-title" style="font-size:var(--fs-base)">Historial de ${esAdmin ? 'cierres y aperturas' : 'aperturas'}</h2>
            </div>
            <div class="card-body" style="padding:var(--sp-3) var(--sp-4)">
                <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:flex-end;margin-bottom:var(--sp-3)">
                    <div style="display:flex;gap:2px;background:var(--color-bg);border-radius:var(--radius);padding:2px">
                        ${tabCierres}
                        <button class="btn btn-sm hist-tab${tabAperturasActiva}" data-tipo="aperturas"${tabAperturasStyle}>Aperturas</button>
                    </div>
                    <div class="form-group" style="min-width:130px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Desde</label>
                        <input type="date" class="form-control" id="hist-inicio" value="${mesI}" style="padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                    </div>
                    <div class="form-group" style="min-width:130px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Hasta</label>
                        <input type="date" class="form-control" id="hist-fin" value="${hoy}" style="padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-filtrar-hist" style="height:34px">Filtrar</button>
                </div>
            </div>
            <div id="hist-contenido"></div>
        </div>`;
}

export function bindHistorial() {
    const esAdmin = State.getUsuario()?.rol === 'administrador';
    // No-admin no tiene pestaña Cierres; arranca en Aperturas
    let tipoActivo = esAdmin ? 'cierres' : 'aperturas';

    document.querySelectorAll('.hist-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.hist-tab').forEach(b => {
                b.style.background = ''; b.style.color = '';
            });
            btn.style.background = 'var(--color-primary)';
            btn.style.color = '#fff';
            tipoActivo = btn.dataset.tipo;
            cargar(tipoActivo);
        });
    });

    document.getElementById('btn-filtrar-hist')?.addEventListener('click', () => cargar(tipoActivo));

    // Carga inicial
    cargar(tipoActivo);
}

async function cargar(tipo) {
    const suc = Sucursal.getSucursalFiltro();
    const inicio = document.getElementById('hist-inicio')?.value || null;
    const fin = document.getElementById('hist-fin')?.value || null;
    const container = document.getElementById('hist-contenido');

    if (tipo === 'cierres') {
        await cargarCierres(container, suc, inicio, fin);
    } else {
        await cargarAperturas(container, suc, inicio, fin);
    }
}

async function cargarCierres(container, suc, inicio, fin) {
    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/caja/cierres', {
        sucursalId: suc, fechaInicio: inicio, fechaFin: fin
    }));
    UI.hideLoader();

    const cierres = res.ok ? res.datos : [];

    if (!cierres.length) {
        container.innerHTML = '<div class="empty-state" style="padding:var(--sp-6)"><p class="text-muted">Sin cierres en este periodo</p></div>';
        return;
    }

    const totalNeto = cierres.reduce((s, c) => s + c.totalNeto, 0);

    container.innerHTML = `
        <div style="padding:var(--sp-2) var(--sp-4);background:var(--color-bg);font-size:var(--fs-sm)">
            <strong>${cierres.length}</strong> cierre(s) · Total neto: <strong style="color:var(--color-success)">${UI.moneda(totalNeto)}</strong>
        </div>
        <div class="table-wrapper" style="border:none"><table class="table"><thead><tr>
            <th>Fecha</th><th>Sucursal</th><th>Neto</th><th>Efectivo</th>
            <th>Diferencia</th><th>Citas</th><th>Pagos</th><th>Estado</th><th>Realizado por</th>
        </tr></thead><tbody>${cierres.map(c => `<tr>
            <td style="white-space:nowrap">${UI.fechaHora(c.fechaCierre)}</td>
            <td>${c.sucursal}</td>
            <td class="font-semibold">${UI.moneda(c.totalNeto)}</td>
            <td>${c.efectivoDeclarado != null ? UI.moneda(c.efectivoDeclarado) : '—'}</td>
            <td style="color:${(c.diferencia ?? 0) < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                ${c.diferencia != null ? UI.moneda(c.diferencia) : '—'}
            </td>
            <td class="text-center">${c.numCitasAtendidas}</td>
            <td class="text-center">${c.numPagosRegistrados}</td>
            <td>${UI.badge(c.estado)}</td>
            <td>${c.realizadoPor}</td>
        </tr>`).join('')}</tbody></table></div>`;
}

async function cargarAperturas(container, suc, inicio, fin) {
    UI.showLoader();
    const esAdmin = State.getUsuario()?.rol === 'administrador';
    // El historial de cierres es solo-admin; para otros roles solo traemos las abiertas
    const promesas = [
        Api.get(Api.buildUrl('/api/caja/abiertas', { sucursalId: suc }))
    ];
    if (esAdmin) {
        promesas.push(Api.get(Api.buildUrl('/api/caja/cierres', { sucursalId: suc, fechaInicio: inicio, fechaFin: fin })));
    }
    const [resAbiertas, resCierres] = await Promise.all(promesas);
    UI.hideLoader();

    const abiertas = resAbiertas.ok ? resAbiertas.datos : [];

    // Combinar: las abiertas + info de las cerradas
    const todas = [];
    abiertas.forEach(a => {
        todas.push({ ...a, estadoLabel: 'abierta', tipo: 'apertura' });
    });

    // Las aperturas cerradas las inferimos de los cierres (solo admin tiene resCierres)
    const cierres = resCierres?.ok ? resCierres.datos : [];
    cierres.forEach(c => {
        todas.push({
            id: c.aperturaId,
            sucursal: c.sucursal,
            abiertoPorNombre: c.realizadoPor,
            fechaApertura: c.fechaCierre,
            montoInicial: null,
            saldoActual: c.totalNeto,
            estadoLabel: 'cerrada',
            tipo: 'cierre'
        });
    });

    if (!todas.length) {
        container.innerHTML = '<div class="empty-state" style="padding:var(--sp-6)"><p class="text-muted">Sin aperturas en este periodo</p></div>';
        return;
    }

    container.innerHTML = `
        <div style="padding:var(--sp-2) var(--sp-4);background:var(--color-bg);font-size:var(--fs-sm)">
            <strong>${abiertas.length}</strong> abierta(s) · <strong>${cierres.length}</strong> cerrada(s)
        </div>
        <div class="table-wrapper" style="border:none"><table class="table"><thead><tr>
            <th>ID</th><th>Sucursal</th><th>Usuario</th><th>Fecha</th>
            <th>Monto inicial</th><th>Saldo</th><th>Movimientos</th><th>Estado</th>
        </tr></thead><tbody>
        ${abiertas.map(a => `<tr>
            <td>#${a.id}</td><td>${a.sucursal}</td><td class="font-semibold">${a.abiertoPorNombre}</td>
            <td>${UI.fechaHora(a.fechaApertura)}</td>
            <td>${UI.moneda(a.montoInicial)}</td>
            <td class="font-semibold" style="color:var(--color-primary)">${UI.moneda(a.saldoActual)}</td>
            <td class="text-center">${a.movimientos?.length ?? 0}</td>
            <td>${UI.badge('abierta')}</td>
        </tr>`).join('')}
        ${cierres.map(c => `<tr style="opacity:0.7">
            <td>#${c.aperturaId ?? '—'}</td><td>${c.sucursal}</td><td>${c.realizadoPor}</td>
            <td>${UI.fechaHora(c.fechaCierre)}</td>
            <td>—</td>
            <td>${UI.moneda(c.totalNeto)}</td>
            <td class="text-center">${c.numPagosRegistrados}</td>
            <td>${UI.badge('cerrada')}</td>
        </tr>`).join('')}
        </tbody></table></div>`;
}