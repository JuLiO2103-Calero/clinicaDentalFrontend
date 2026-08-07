// ============================================================
// reportes/index.js — Dashboard de reportes con pestañas
// ============================================================

import Api      from '../../core/api.js';
import Sucursal from '../../core/sucursal.js';
import State    from '../../core/state.js';
import UI       from '../../utils/ui.js';
import { descargarExcel, descargarPDF } from './exportar.js';
import { renderCitasDoctor } from './citas-doctor.js';

const TABS = [
    { id: 'caja',        label: '💰 Caja',           adminOnly: false },
    { id: 'movimientos', label: '🧾 Caja detallado', adminOnly: false },
    { id: 'pagos',       label: '💳 Pagos',          adminOnly: false },
    { id: 'citas',       label: '📅 Citas',          adminOnly: false },
    { id: 'sucursales',  label: '🏥 Sucursales',     adminOnly: true },
    { id: 'usuarios',    label: '👤 Usuarios',       adminOnly: true },
    { id: 'historial',   label: '📋 Historial',      adminOnly: true },
];

function hoy() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Managua' }); }
function mesI() { const d = hoy(); return d.slice(0, 8) + '01'; }

let _personal = [];
let _cierres = [];

const ReportesModule = {
    async render(container, hash) {
        // Ruta a citas de un doctor: #/reportes/doctor/:id/:nombre/:ini/:fin
        if (hash && hash.includes('/reportes/doctor/')) {
            const partes = hash.split('/reportes/doctor/')[1].split('/');
            const [id, nombre, ini, fin] = partes;
            await renderCitasDoctor(container, parseInt(id), decodeURIComponent(nombre), ini, fin);
            return;
        }

        // Cargar personal (para filtro de usuario en movimientos)
        const resP = await Api.get('/api/usuarios/personal');
        _personal = resP.ok ? resP.datos : [];

        const esAdmin = State.getUsuario()?.rol === 'administrador';
        const tabsVisibles = TABS.filter(t => !t.adminOnly || esAdmin);
        const tabsHtml = tabsVisibles.map(t =>
            `<button class="btn btn-ghost btn-sm tab-rep" data-tab="${t.id}">${t.label}</button>`).join('');

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Reportes</h1>
                <p class="page-subtitle">Análisis y estadísticas del sistema</p>
            </div>
            <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4)">${tabsHtml}</div>
            <div class="card"><div class="card-body" id="rep-contenido">
                <p class="text-muted text-center" style="padding:var(--sp-6)">Selecciona un reporte</p>
            </div></div>`;

        container.querySelectorAll('.tab-rep').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tab-rep').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); });
                btn.classList.add('btn-primary'); btn.classList.remove('btn-ghost');
                this._cargarTab(btn.dataset.tab);
            });
        });
        container.querySelector('.tab-rep').click();
    },

    _cargarTab(tab) {
        const cont = document.getElementById('rep-contenido');

        if (tab === 'historial') {
            cont.innerHTML = `
                <div style="display:flex;gap:var(--sp-2);align-items:center;margin-bottom:var(--sp-4)">
                    <label class="text-sm text-muted">Nº Expediente</label>
                    <input type="text" class="form-control" id="rep-expediente" placeholder="EXP-001" style="width:200px;padding:var(--sp-1) var(--sp-2)" />
                    <button class="btn btn-primary btn-sm" id="btn-rep-historial">🔍 Buscar</button>
                </div><div id="rep-resultado"></div>`;
            document.getElementById('btn-rep-historial').addEventListener('click', () => this._historial());
            return;
        }

        // Filtros comunes
        let filtrosExtra = '';
        if (tab === 'movimientos') {
            const esAdmin = State.getUsuario()?.rol === 'administrador';
            const opsUsuarios = _personal.map(u => `<option value="${u.id}">${u.nombreCompleto}</option>`).join('');
            // El filtro por cierre solo se muestra a admin (endpoint de cierres es admin-only)
            const filtroCierre = esAdmin ? `
                <label class="text-sm text-muted">Cierre</label>
                <select class="form-control" id="rep-cierre" style="width:170px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                    <option value="">Todos</option>
                </select>` : '';
            filtrosExtra = `
                <label class="text-sm text-muted">Usuario</label>
                <select class="form-control" id="rep-usuario" style="width:180px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                    <option value="">Todos</option>${opsUsuarios}
                </select>
                ${filtroCierre}`;
        }

        cont.innerHTML = `
            <div style="display:flex;gap:var(--sp-2);align-items:center;flex-wrap:wrap;margin-bottom:var(--sp-4)">
                <label class="text-sm text-muted">Desde</label>
                <input type="date" class="form-control" id="rep-ini" value="${mesI()}" style="width:140px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                <label class="text-sm text-muted">Hasta</label>
                <input type="date" class="form-control" id="rep-fin" value="${hoy()}" style="width:140px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" />
                ${filtrosExtra}
                <button class="btn btn-primary btn-sm" id="btn-rep-buscar">🔍 Generar</button>
            </div><div id="rep-resultado"></div>`;

        document.getElementById('btn-rep-buscar').addEventListener('click', () => this._ejecutar(tab));

        // Para movimientos, cargar los cierres del filtro
        if (tab === 'movimientos') this._cargarCierres();
    },

    async _cargarCierres() {
        // El endpoint de cierres es solo-admin; no lo llamamos para otros roles
        if (State.getUsuario()?.rol !== 'administrador') return;
        const suc = Sucursal.getSucursalFiltro();
        const res = await Api.get(Api.buildUrl('/api/caja/cierres', suc ? { sucursalId: suc } : {}));
        _cierres = res.ok ? res.datos : [];
        const sel = document.getElementById('rep-cierre');
        if (sel && _cierres.length) {
            sel.innerHTML = '<option value="">Todos</option>' + _cierres.map(c =>
                `<option value="${c.aperturaId}">${UI.fecha(c.fechaCierre)} · ${c.usuario ?? ''}</option>`).join('');
        }
    },

    async _ejecutar(tab) {
        const ini = document.getElementById('rep-ini')?.value;
        const fin = document.getElementById('rep-fin')?.value;
        if (!ini || !fin) { UI.toast('Selecciona el rango de fechas', 'warning'); return; }
        if (ini > fin) { UI.toast('La fecha inicial no puede ser mayor a la final', 'warning'); return; }

        const suc = Sucursal.getSucursalFiltro();
        const params = { fechaInicio: ini, fechaFin: fin };
        if (suc) params.sucursalId = suc;

        if (tab === 'movimientos') {
            const usuarioId = document.getElementById('rep-usuario')?.value;
            const aperturaId = document.getElementById('rep-cierre')?.value;
            if (usuarioId) params.usuarioId = usuarioId;
            if (aperturaId) params.aperturaId = aperturaId;
        }

        UI.showLoader();
        const endpoint = tab === 'movimientos' ? '/api/reportes/caja/movimientos' : `/api/reportes/${tab}`;
        const res = await Api.get(Api.buildUrl(endpoint, params));
        UI.hideLoader();

        const cont = document.getElementById('rep-resultado');
        if (!res.ok) { cont.innerHTML = `<p class="text-danger">${res.mensaje}</p>`; return; }

        switch (tab) {
            case 'caja':        this._renderCaja(cont, res.datos, ini, fin); break;
            case 'movimientos': this._renderMovimientos(cont, res.datos, ini, fin); break;
            case 'pagos':       this._renderPagos(cont, res.datos); break;
            case 'citas':       this._renderCitas(cont, res.datos, ini, fin); break;
            case 'sucursales':  this._renderSucursales(cont, res.datos); break;
            case 'usuarios':    this._renderUsuarios(cont, res.datos); break;
        }
    },

    // ── Caja por día (con descarga) ──
    _renderCaja(cont, data, ini, fin) {
        const dias = data.dias || [];
        const tot = data.totales || {};
        if (!dias.length) { cont.innerHTML = '<p class="text-muted">Sin datos en este periodo</p>'; return; }

        cont.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-2);margin-bottom:var(--sp-4)">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-3);flex:1">
                    <div class="stat-card"><div class="stat-value">${UI.moneda(tot.neto || 0)}</div><div class="stat-label">Neto total</div></div>
                    <div class="stat-card"><div class="stat-value">${tot.numPagos || 0}</div><div class="stat-label">Pagos</div></div>
                    <div class="stat-card"><div class="stat-value">${UI.moneda(tot.efectivo || 0)}</div><div class="stat-label">Efectivo</div></div>
                    <div class="stat-card"><div class="stat-value">${UI.moneda(tot.transferencia || 0)}</div><div class="stat-label">Transferencia</div></div>
                </div>
            </div>
            <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;margin-bottom:var(--sp-2)">
                <button class="btn btn-outline btn-sm" id="caja-excel">📊 Excel</button>
                <button class="btn btn-outline btn-sm" id="caja-pdf">📄 PDF</button>
            </div>
            <div class="table-wrapper"><table class="table"><thead><tr>
                <th>Fecha</th><th>Pagos</th><th>Bruto</th><th>Desc.</th><th>Neto</th>
                <th>Efectivo</th><th>Tarjeta</th><th>Transfer.</th>
            </tr></thead><tbody>${dias.map(d => `<tr>
                <td style="white-space:nowrap">${UI.fecha(d.fecha)}</td>
                <td>${d.numPagos}</td><td>${UI.moneda(d.bruto)}</td>
                <td>${d.descuentos > 0 ? UI.moneda(d.descuentos) : '—'}</td>
                <td class="font-semibold">${UI.moneda(d.neto)}</td>
                <td>${UI.moneda(d.efectivo)}</td>
                <td>${UI.moneda((d.tarjetaDebito || 0) + (d.tarjetaCredito || 0))}</td>
                <td>${UI.moneda(d.transferencia)}</td>
            </tr>`).join('')}</tbody></table></div>`;

        const columnas = ['Fecha', 'Pagos', 'Bruto', 'Descuentos', 'Neto', 'Efectivo', 'Tarjeta', 'Transferencia'];
        const filas = dias.map(d => [UI.fecha(d.fecha), d.numPagos, d.bruto, d.descuentos,
            d.neto, d.efectivo, (d.tarjetaDebito || 0) + (d.tarjetaCredito || 0), d.transferencia]);
        document.getElementById('caja-excel').addEventListener('click', () => descargarExcel(`caja_${ini}_${fin}`, columnas, filas));
        document.getElementById('caja-pdf').addEventListener('click', () => descargarPDF('Reporte de Caja', `${ini} a ${fin}`, columnas, filas));
    },

    // ── Movimientos detallados (con descarga) ──
    _renderMovimientos(cont, movs, ini, fin) {
        if (!movs?.length) { cont.innerHTML = '<p class="text-muted">Sin movimientos con esos filtros</p>'; return; }

        const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
        const egresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

        cont.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4)">
                <div class="stat-card"><div class="stat-value">${movs.length}</div><div class="stat-label">Movimientos</div></div>
                <div class="stat-card"><div class="stat-value" style="color:var(--color-success)">${UI.moneda(ingresos)}</div><div class="stat-label">Ingresos</div></div>
                <div class="stat-card"><div class="stat-value" style="color:var(--color-danger)">${UI.moneda(egresos)}</div><div class="stat-label">Egresos</div></div>
                <div class="stat-card"><div class="stat-value">${UI.moneda(ingresos - egresos)}</div><div class="stat-label">Neto</div></div>
            </div>
            <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;margin-bottom:var(--sp-2)">
                <button class="btn btn-outline btn-sm" id="mov-excel">📊 Excel</button>
                <button class="btn btn-outline btn-sm" id="mov-pdf">📄 PDF</button>
            </div>
            <div class="table-wrapper"><table class="table"><thead><tr>
                <th>Fecha</th><th>Cierre #</th><th>Usuario</th><th>Tipo</th>
                <th>Método</th><th>Concepto</th><th>Pago #</th><th>Monto</th>
            </tr></thead><tbody>${movs.map(m => `<tr>
                <td style="white-space:nowrap">${UI.fechaHora(m.fecha)}</td>
                <td>#${m.aperturaId}</td>
                <td>${m.usuario}</td>
                <td>${m.tipo === 'ingreso' ? '<span style="color:var(--color-success)">▲ Ingreso</span>' : '<span style="color:var(--color-danger)">▼ Egreso</span>'}</td>
                <td>${m.metodoPago ?? '—'}</td>
                <td class="text-sm">${m.concepto}</td>
                <td>${m.pagoId ? '#' + m.pagoId : '—'}</td>
                <td class="font-semibold">${UI.moneda(m.monto)}</td>
            </tr>`).join('')}</tbody></table></div>`;

        const columnas = ['Fecha', 'Cierre', 'Usuario', 'Tipo', 'Método', 'Concepto', 'Pago', 'Monto'];
        const filas = movs.map(m => [UI.fechaHora(m.fecha), m.aperturaId, m.usuario, m.tipo,
            m.metodoPago ?? '', m.concepto, m.pagoId ?? '', m.monto]);
        document.getElementById('mov-excel').addEventListener('click', () => descargarExcel(`movimientos_${ini}_${fin}`, columnas, filas));
        document.getElementById('mov-pdf').addEventListener('click', () => descargarPDF('Movimientos de Caja', `${ini} a ${fin}`, columnas, filas));
    },

    // ── Pagos ──
    _renderPagos(cont, data) {
        const porMetodo = data.porMetodo || [];
        const porSuc = data.porSucursal || [];
        cont.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4)">
                <div class="stat-card"><div class="stat-value">${data.numPagos || 0}</div><div class="stat-label">Total pagos</div></div>
                <div class="stat-card"><div class="stat-value">${UI.moneda(data.bruto || 0)}</div><div class="stat-label">Bruto</div></div>
                <div class="stat-card"><div class="stat-value">${UI.moneda(data.descuentos || 0)}</div><div class="stat-label">Descuentos</div></div>
                <div class="stat-card"><div class="stat-value">${UI.moneda(data.neto || 0)}</div><div class="stat-label">Neto</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
                <div><h4 style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-2)">Por método</h4>
                    <div class="table-wrapper"><table class="table"><thead><tr><th>Método</th><th>Pagos</th><th>Total</th></tr></thead>
                    <tbody>${porMetodo.map(m => `<tr><td>${m.metodo}</td><td>${m.numPagos}</td><td class="font-semibold">${UI.moneda(m.total)}</td></tr>`).join('')}</tbody></table></div></div>
                <div><h4 style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-2)">Por sucursal</h4>
                    <div class="table-wrapper"><table class="table"><thead><tr><th>Sucursal</th><th>Pagos</th><th>Total</th></tr></thead>
                    <tbody>${porSuc.map(s => `<tr><td>${s.sucursal}</td><td>${s.numPagos}</td><td class="font-semibold">${UI.moneda(s.total)}</td></tr>`).join('')}</tbody></table></div></div>
            </div>`;
    },

    // ── Citas (doctores clickeables) ──
    _renderCitas(cont, data, ini, fin) {
        const porEstado = data.porEstado || [];
        const porDoctor = data.porDoctor || [];
        cont.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-4)">
                <div class="stat-card"><div class="stat-value">${data.total || 0}</div><div class="stat-label">Total citas</div></div>
                <div class="stat-card"><div class="stat-value">${data.completadas || 0}</div><div class="stat-label">Completadas</div></div>
                <div class="stat-card"><div class="stat-value">${data.canceladas || 0}</div><div class="stat-label">Canceladas</div></div>
                <div class="stat-card"><div class="stat-value">${data.total > 0 ? Math.round((data.completadas / data.total) * 100) : 0}%</div><div class="stat-label">Tasa completadas</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
                <div><h4 style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-2)">Por estado</h4>
                    <div class="table-wrapper"><table class="table"><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
                    <tbody>${porEstado.map(e => `<tr><td>${UI.badge(e.estado)}</td><td>${e.cantidad}</td></tr>`).join('')}</tbody></table></div></div>
                <div><h4 style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-2)">Por doctor <span class="text-xs text-muted">(clic para ver sus citas)</span></h4>
                    <div class="table-wrapper"><table class="table"><thead><tr><th>Doctor</th><th>Total</th><th>Completadas</th></tr></thead>
                    <tbody>${porDoctor.map(d => `<tr class="fila-doctor" data-id="${d.doctorId}" data-nombre="${d.doctor}" style="cursor:pointer">
                        <td style="color:var(--color-primary);font-weight:600;text-decoration:underline">${d.doctor}</td>
                        <td>${d.total}</td><td>${d.completadas}</td></tr>`).join('')}</tbody></table></div></div>
            </div>`;

        cont.querySelectorAll('.fila-doctor').forEach(fila => {
            fila.addEventListener('click', () => {
                const id = fila.dataset.id;
                const nombre = encodeURIComponent(fila.dataset.nombre);
                window.location.hash = `#/reportes/doctor/${id}/${nombre}/${ini}/${fin}`;
            });
        });
    },

    _renderSucursales(cont, data) {
        if (!data?.length) { cont.innerHTML = '<p class="text-muted">Sin datos</p>'; return; }
        cont.innerHTML = `<div class="table-wrapper"><table class="table"><thead><tr>
            <th>Sucursal</th><th>Citas</th><th>Completadas</th><th>Pagos</th><th>Neto</th><th>Anulado</th>
            </tr></thead><tbody>${data.map(s => `<tr>
                <td class="font-semibold">${s.sucursal}</td><td>${s.citasTotal}</td><td>${s.citasCompletadas}</td>
                <td>${s.numPagos}</td><td class="font-semibold" style="color:var(--color-success)">${UI.moneda(s.totalNeto)}</td>
                <td style="color:var(--color-danger)">${s.totalAnulado > 0 ? UI.moneda(s.totalAnulado) : '—'}</td>
            </tr>`).join('')}</tbody></table></div>`;
    },

    _renderUsuarios(cont, data) {
        if (!data?.length) { cont.innerHTML = '<p class="text-muted">Sin datos</p>'; return; }
        cont.innerHTML = `<div class="table-wrapper"><table class="table"><thead><tr>
            <th>Usuario</th><th>Rol</th><th>Pagos recibidos</th><th>Monto</th>
            <th>Citas (doctor)</th><th>Completadas</th><th>Citas creadas</th>
            </tr></thead><tbody>${data.map(u => `<tr>
                <td class="font-semibold">${u.usuario}</td><td>${UI.badge(u.rol)}</td>
                <td>${u.pagosRecibidos}</td><td>${UI.moneda(u.montoRecibido)}</td>
                <td>${u.citasComoDoctor}</td><td>${u.citasCompletadasComoDoctor}</td><td>${u.citasCreadas}</td>
            </tr>`).join('')}</tbody></table></div>`;
    },

    async _historial() {
        const exp = document.getElementById('rep-expediente')?.value.trim();
        if (!exp) { UI.toast('Ingresa el número de expediente', 'warning'); return; }
        UI.showLoader();
        const res = await Api.get(`/api/reportes/historial-paciente/${encodeURIComponent(exp)}`);
        UI.hideLoader();
        const cont = document.getElementById('rep-resultado');
        if (!res.ok) { cont.innerHTML = `<p class="text-danger">${res.mensaje}</p>`; return; }
        const datos = res.datos || [];
        if (!datos.length) { cont.innerHTML = '<p class="text-muted">Sin historial para este expediente</p>'; return; }
        const pac = datos[0];
        cont.innerHTML = `
            <div style="background:var(--color-bg);padding:var(--sp-3);border-radius:var(--radius);margin-bottom:var(--sp-4)">
                <div class="font-semibold">${pac.paciente}</div>
                <div class="text-sm text-muted">Expediente: ${pac.numeroExpediente} · ${datos.length} consulta(s)</div>
            </div>
            <div class="table-wrapper"><table class="table"><thead><tr>
                <th>Fecha</th><th>Servicio</th><th>Doctor</th><th>Estado</th>
                <th>Diagnóstico</th><th>Tratamiento</th><th>Cobrado</th><th>Método</th>
            </tr></thead><tbody>${datos.map(d => `<tr>
                <td style="white-space:nowrap">${UI.fechaHora(d.fechaCita)}</td>
                <td>${d.servicio ?? '—'}</td><td>${d.doctor}</td><td>${UI.badge(d.estadoCita)}</td>
                <td class="text-sm">${d.diagnostico ?? '—'}</td><td class="text-sm">${d.tratamiento ?? '—'}</td>
                <td>${d.totalCobrado != null ? UI.moneda(d.totalCobrado) : '—'}</td><td>${d.metodoPago ?? '—'}</td>
            </tr>`).join('')}</tbody></table></div>`;
    },

    destroy() {}
};

export default ReportesModule;
