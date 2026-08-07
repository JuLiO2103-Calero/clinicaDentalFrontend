// ============================================================
// auditoria/index.js — Bitácora de acciones del sistema
// Solo admin. Filtros: usuario, acción, módulo, rango de fechas.
// Pagina en el cliente sobre los últimos 500 registros.
// ============================================================

import Api from '../../core/api.js';
import UI from '../../utils/ui.js';

const POR_PAGINA = 20;

// Traduce el método HTTP crudo a una etiqueta legible con color
function etiquetaAccion(accion) {
    const a = (accion || '').toUpperCase();
    if (a.startsWith('POST')) return { texto: 'Crear', bg: 'var(--color-success-bg, #d1e7dd)', color: 'var(--color-success, #0a3622)' };
    if (a.startsWith('PUT') || a.startsWith('PATCH')) return { texto: 'Editar', bg: '#e6f1fb', color: '#0c447c' };
    if (a.startsWith('DELETE')) return { texto: 'Eliminar', bg: '#fce9e9', color: '#a32d2d' };
    if (a.includes('anular') || a.includes('ANULAR')) return { texto: 'Anular', bg: '#fce9e9', color: '#a32d2d' };
    if (a.startsWith('GET')) return { texto: 'Consultar', bg: 'var(--color-bg, #f1efe8)', color: 'var(--color-text-muted, #5f5e5a)' };
    return { texto: accion?.split(' ')[0] || '—', bg: 'var(--color-bg)', color: 'var(--color-text-muted)' };
}

function hoy() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Managua' }); }
function mesI() { return hoy().slice(0, 8) + '01'; }

const AuditoriaModule = {
    _registros: [],
    _pagina: 1,

    async render(container) {
        // Cargar personal para el filtro de usuario
        const resP = await Api.get('/api/usuarios/personal');
        const personal = resP.ok ? resP.datos : [];
        const opsUsuarios = personal.map(u => `<option value="${u.id}">${u.nombreCompleto}</option>`).join('');

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Auditoría</h1>
                <p class="page-subtitle">Registro de todas las acciones del sistema</p>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:var(--sp-4);padding:var(--sp-3);background:var(--color-bg);border-radius:var(--radius)">
                <div><label class="form-label" style="font-size:var(--fs-xs)">Usuario</label>
                    <select class="form-control" id="aud-usuario" style="width:160px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                        <option value="">Todos</option>${opsUsuarios}
                    </select></div>
                <div><label class="form-label" style="font-size:var(--fs-xs)">Acción</label>
                    <select class="form-control" id="aud-accion" style="width:130px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                        <option value="">Todas</option>
                        <option value="POST">Crear</option>
                        <option value="PUT">Editar</option>
                        <option value="DELETE">Eliminar</option>
                        <option value="anular">Anular</option>
                    </select></div>
                <div><label class="form-label" style="font-size:var(--fs-xs)">Módulo</label>
                    <select class="form-control" id="aud-modulo" style="width:120px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                        <option value="">Todos</option>
                        <option value="pacientes">pacientes</option>
                        <option value="citas">citas</option>
                        <option value="consultas">consultas</option>
                        <option value="pagos">pagos</option>
                        <option value="caja">caja</option>
                        <option value="usuarios">usuarios</option>
                    </select></div>
                <div><label class="form-label" style="font-size:var(--fs-xs)">Desde</label>
                    <input type="date" class="form-control" id="aud-inicio" value="${mesI()}" style="width:130px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" /></div>
                <div><label class="form-label" style="font-size:var(--fs-xs)">Hasta</label>
                    <input type="date" class="form-control" id="aud-fin" value="${hoy()}" style="width:130px;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)" /></div>
                <button class="btn btn-primary btn-sm" id="aud-filtrar" style="height:34px">🔍 Filtrar</button>
            </div>

            <div class="card"><div class="card-body" id="aud-contenido">
                <p class="text-muted text-center" style="padding:var(--sp-4)">Presiona Filtrar para ver los registros</p>
            </div></div>`;

        document.getElementById('aud-filtrar').addEventListener('click', () => this._buscar());
        // Carga inicial automática
        this._buscar();
    },

    async _buscar() {
        const params = {};
        const usuario = document.getElementById('aud-usuario').value;
        const accion = document.getElementById('aud-accion').value;
        const modulo = document.getElementById('aud-modulo').value;
        const inicio = document.getElementById('aud-inicio').value;
        const fin = document.getElementById('aud-fin').value;
        if (usuario) params.usuarioId = usuario;
        if (accion) params.accion = accion;
        if (modulo) params.tablaAfectada = modulo;
        if (inicio) params.fechaInicio = inicio;
        if (fin) params.fechaFin = fin;

        UI.showLoader();
        const res = await Api.get(Api.buildUrl('/api/auditoria', params));
        UI.hideLoader();

        const cont = document.getElementById('aud-contenido');
        if (!res.ok) { cont.innerHTML = `<p class="text-danger">${res.mensaje}</p>`; return; }

        this._registros = res.datos || [];
        this._pagina = 1;
        this._pintar();
    },

    _pintar() {
        const cont = document.getElementById('aud-contenido');
        const total = this._registros.length;

        if (!total) {
            cont.innerHTML = '<p class="text-muted text-center" style="padding:var(--sp-4)">Sin registros con esos filtros</p>';
            return;
        }

        const totalPaginas = Math.ceil(total / POR_PAGINA);
        const desde = (this._pagina - 1) * POR_PAGINA;
        const pagina = this._registros.slice(desde, desde + POR_PAGINA);

        cont.innerHTML = `
            <div class="table-wrapper"><table class="table"><thead><tr>
                <th>Fecha y hora</th><th>Usuario</th><th>Acción</th>
                <th>Módulo</th><th>Descripción</th><th>IP</th>
            </tr></thead><tbody>${pagina.map(r => {
            const et = etiquetaAccion(r.accion);
            return `<tr>
                    <td style="white-space:nowrap;color:var(--color-text-muted)">${UI.fechaHora(r.registradoEn)}</td>
                    <td>${r.usuario ?? '—'}</td>
                    <td><span style="background:${et.bg};color:${et.color};padding:2px 8px;border-radius:var(--radius);font-size:var(--fs-xs)">${et.texto}</span></td>
                    <td>${r.tablaAfectada ?? '—'}</td>
                    <td class="text-sm">${r.descripcion ?? r.accion ?? '—'}</td>
                    <td style="color:var(--color-text-muted)">${r.ip ?? '—'}</td>
                </tr>`;
        }).join('')}</tbody></table></div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--sp-3)">
                <div class="text-sm text-muted">Mostrando ${desde + 1}–${Math.min(desde + POR_PAGINA, total)} de ${total} registros</div>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-outline btn-sm" id="aud-prev" ${this._pagina === 1 ? 'disabled' : ''}>← Anterior</button>
                    <span class="text-sm" style="padding:0 var(--sp-2);align-self:center">${this._pagina} / ${totalPaginas}</span>
                    <button class="btn btn-outline btn-sm" id="aud-next" ${this._pagina === totalPaginas ? 'disabled' : ''}>Siguiente →</button>
                </div>
            </div>`;

        document.getElementById('aud-prev')?.addEventListener('click', () => {
            if (this._pagina > 1) { this._pagina--; this._pintar(); }
        });
        document.getElementById('aud-next')?.addEventListener('click', () => {
            if (this._pagina < totalPaginas) { this._pagina++; this._pintar(); }
        });
    },

    destroy() { }
};

export default AuditoriaModule;