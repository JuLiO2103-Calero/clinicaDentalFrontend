// ============================================================
// dashboard/calendario.js — Calendario de citas (día / semana)
// Filtro de sucursal PROPIO (una a la vez), independiente del
// selector global de arriba. Por defecto: la sucursal del usuario,
// o la primera de la lista si el usuario no tiene asignada (admin).
// Franjas: sin marcar = libre, amarillo = 1 cita, naranja = 2+.
// Clic en franja libre -> agendar; en ocupada -> avisa y agenda igual.
// ============================================================
import Api from '../../core/api.js';
import State from '../../core/state.js';
import UI from '../../utils/ui.js';
const HORA_INICIO = 8;   // 8:00 am
const HORA_FIN = 18;  // 6:00 pm
const PIXELES_POR_HORA = 60;
let _vista = 'dia';        // 'dia' | 'semana'
let _fecha = new Date();   // fecha de referencia
let _citas = [];
let _sucursales = [];      // lista de sucursales para el filtro
let _sucursalSel = null;   // sucursal seleccionada en el calendario
function ymd(d) { return d.toLocaleDateString('en-CA', { timeZone: 'America/Managua' }); }
function inicioSemana(d) {
    const x = new Date(d);
    const dia = x.getDay();               // 0=domingo
    const diff = dia === 0 ? -6 : 1 - dia; // lunes como inicio
    x.setDate(x.getDate() + diff);
    return x;
}
export function crearCalendarioHTML() {
    return `
        <div class="card mt-4">
            <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-2)">
                <div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap">
                    <h2 class="card-title" style="font-size:var(--fs-base)">📅 Calendario de citas</h2>
                    <select class="form-control" id="cal-sucursal" style="width:auto;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)">
                        <option value="">Cargando...</option>
                    </select>
                </div>
                <div style="display:flex;gap:var(--sp-2);align-items:center;flex-wrap:wrap">
                    <div style="display:flex;gap:2px;background:var(--color-bg);border-radius:var(--radius);padding:2px">
                        <button class="btn btn-sm cal-vista" data-vista="dia">Día</button>
                        <button class="btn btn-sm cal-vista" data-vista="semana">Semana</button>
                    </div>
                    <button class="btn btn-ghost btn-sm" id="cal-prev">←</button>
                    <span id="cal-titulo" style="font-size:var(--fs-sm);font-weight:600;min-width:180px;text-align:center"></span>
                    <button class="btn btn-ghost btn-sm" id="cal-next">→</button>
                    <button class="btn btn-outline btn-sm" id="cal-hoy">Hoy</button>
                </div>
            </div>
            <div class="card-body" style="padding:0">
                <div id="cal-contenido" style="overflow-x:auto"></div>
                <div style="display:flex;gap:var(--sp-4);padding:var(--sp-2) var(--sp-4);border-top:1px solid var(--color-border);font-size:var(--fs-xs);flex-wrap:wrap">
                    <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;border-radius:3px;background:var(--color-surface);border:1px solid var(--color-border)"></span> Disponible</span>
                    <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;border-radius:3px;background:#fde68a"></span> 1 cita</span>
                    <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;border-radius:3px;background:#fb923c"></span> 2+ citas</span>
                    <span style="color:var(--color-text-muted)">· Clic en un espacio libre para agendar</span>
                </div>
            </div>
        </div>`;
}
export async function bindCalendario() {
    document.querySelectorAll('.cal-vista').forEach(b => {
        b.addEventListener('click', () => { _vista = b.dataset.vista; _pintarBotones(); cargar(); });
    });
    document.getElementById('cal-prev').addEventListener('click', () => { mover(-1); });
    document.getElementById('cal-next').addEventListener('click', () => { mover(1); });
    document.getElementById('cal-hoy').addEventListener('click', () => { _fecha = new Date(); cargar(); });
    _pintarBotones();

    // Cargar las sucursales para el filtro propio del calendario
    await cargarSucursales();

    // Filtro de sucursal propio: al cambiar, recarga el calendario
    document.getElementById('cal-sucursal')?.addEventListener('change', e => {
        _sucursalSel = e.target.value ? parseInt(e.target.value) : null;
        cargar();
    });

    cargar();
}
async function cargarSucursales() {
    const sel = document.getElementById('cal-sucursal');
    if (!sel) return;
    const res = await Api.get('/api/sucursales');
    _sucursales = res.ok ? res.datos : [];

    if (!_sucursales.length) {
        sel.innerHTML = '<option value="">Sin sucursales</option>';
        return;
    }

    // Sucursal por defecto: la del usuario, o la primera de la lista (admin)
    const miSuc = State.getUsuario()?.sucursalId;
    _sucursalSel = miSuc ?? _sucursales[0].id;

    sel.innerHTML = _sucursales.map(s =>
        `<option value="${s.id}" ${s.id === _sucursalSel ? 'selected' : ''}>${s.nombre}</option>`
    ).join('');
}
function _pintarBotones() {
    document.querySelectorAll('.cal-vista').forEach(b => {
        const activo = b.dataset.vista === _vista;
        b.classList.toggle('btn-primary', activo);
        b.style.background = activo ? 'var(--color-primary)' : 'transparent';
        b.style.color = activo ? '#fff' : 'var(--color-text)';
    });
}
function mover(dir) {
    const paso = _vista === 'dia' ? 1 : 7;
    _fecha.setDate(_fecha.getDate() + paso * dir);
    cargar();
}
async function cargar() {
    // Si el calendario ya no está en pantalla, no hacer nada
    if (!document.getElementById('cal-contenido')) return;

    let ini, fin;
    if (_vista === 'dia') {
        ini = fin = ymd(_fecha);
    } else {
        const is = inicioSemana(_fecha);
        const fs = new Date(is); fs.setDate(fs.getDate() + 6);
        ini = ymd(is); fin = ymd(fs);
    }
    // Usa SIEMPRE la sucursal del filtro propio del calendario (una a la vez)
    const params = { fechaInicio: ini, fechaFin: fin };
    if (_sucursalSel) params.sucursalId = _sucursalSel;
    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/citas', params));
    UI.hideLoader();
    _citas = res.ok ? res.datos : [];
    if (_vista === 'dia') _pintarDia();
    else _pintarSemana();
}
// Devuelve las citas de un día concreto (ymd)
function citasDe(fechaYmd) {
    return _citas.filter(c => ymd(new Date(c.fechaHora)) === fechaYmd)
        .filter(c => c.estado !== 'cancelada');
}
// Cuenta cuántas citas caen dentro de una franja de hora
function contarEnFranja(citas, hora) {
    return citas.filter(c => new Date(c.fechaHora).getHours() === hora).length;
}
function colorFranja(cantidad) {
    if (cantidad === 0) return 'var(--color-surface)';
    if (cantidad === 1) return '#fde68a';
    return '#fb923c';
}
function _pintarDia() {
    const cont = document.getElementById('cal-contenido');
    const titulo = document.getElementById('cal-titulo');
    if (!cont || !titulo) return;

    titulo.textContent = _fecha.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Managua' });
    const fechaStr = ymd(_fecha);
    const citas = citasDe(fechaStr);
    let filas = '';
    for (let h = HORA_INICIO; h < HORA_FIN; h++) {
        const cant = contarEnFranja(citas, h);
        const citasHora = citas.filter(c => new Date(c.fechaHora).getHours() === h)
            .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        const bloques = citasHora.map(c => bloqueCita(c)).join('');
        filas += `
            <div style="display:flex;border-bottom:1px solid var(--color-border);min-height:${PIXELES_POR_HORA}px">
                <div style="width:70px;flex-shrink:0;padding:var(--sp-2);font-size:var(--fs-xs);color:var(--color-text-muted);border-right:1px solid var(--color-border);text-align:right">
                    ${formatoHora(h)}
                </div>
                <div class="cal-franja" data-fecha="${fechaStr}" data-hora="${h}" data-cant="${cant}"
                    style="flex:1;background:${colorFranja(cant)};padding:4px;display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start;cursor:pointer"
                    title="${cant === 0 ? 'Clic para agendar aquí' : 'Ya hay ' + cant + ' cita(s) — clic para agendar otra'}">
                    ${bloques}
                </div>
            </div>`;
    }
    cont.innerHTML = `<div style="min-width:400px">${filas}</div>`;
    _bindClicks();
}
function _pintarSemana() {
    const cont = document.getElementById('cal-contenido');
    const titulo = document.getElementById('cal-titulo');
    if (!cont || !titulo) return;

    const is = inicioSemana(_fecha);
    const dias = [];
    for (let i = 0; i < 7; i++) { const d = new Date(is); d.setDate(d.getDate() + i); dias.push(d); }
    const fs = dias[6];
    titulo.textContent = `${is.getDate()}/${is.getMonth() + 1} – ${fs.getDate()}/${fs.getMonth() + 1}`;
    const hoy = ymd(new Date());
    let encab = '<div style="width:55px;flex-shrink:0;border-right:1px solid var(--color-border)"></div>';
    dias.forEach(d => {
        const esHoy = ymd(d) === hoy;
        encab += `<div style="flex:1;padding:var(--sp-2);text-align:center;font-size:var(--fs-xs);border-right:1px solid var(--color-border);${esHoy ? 'background:var(--color-primary);color:#fff' : 'color:var(--color-text-muted)'}">
            <div style="font-weight:600">${d.toLocaleDateString('es-NI', { weekday: 'short', timeZone: 'America/Managua' })}</div>
            <div>${d.getDate()}</div>
        </div>`;
    });
    let filas = '';
    for (let h = HORA_INICIO; h < HORA_FIN; h++) {
        let celdas = `<div style="width:55px;flex-shrink:0;padding:var(--sp-1);font-size:10px;color:var(--color-text-muted);border-right:1px solid var(--color-border);text-align:right">${formatoHora(h)}</div>`;
        dias.forEach(d => {
            const citas = citasDe(ymd(d));
            const cant = contarEnFranja(citas, h);
            const citasHora = citas.filter(c => new Date(c.fechaHora).getHours() === h);
            const puntos = citasHora.map(c =>
                `<div class="cal-cita-mini" data-id="${c.id}" title="${formatoHoraMin(c.fechaHora)} · ${c.paciente}" style="font-size:9px;padding:1px 3px;background:rgba(0,0,0,.12);border-radius:3px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${c.paciente?.split(' ')[0] ?? 'Cita'}</div>`
            ).join('');
            celdas += `<div class="cal-franja" data-fecha="${ymd(d)}" data-hora="${h}" data-cant="${cant}"
                style="flex:1;min-height:44px;border-right:1px solid var(--color-border);border-bottom:1px solid var(--color-border);background:${colorFranja(cant)};padding:2px;display:flex;flex-direction:column;gap:2px;cursor:pointer"
                title="${cant === 0 ? 'Clic para agendar aquí' : 'Ya hay ' + cant + ' cita(s) — clic para agendar otra'}">${puntos}</div>`;
        });
        filas += `<div style="display:flex">${celdas}</div>`;
    }
    cont.innerHTML = `
        <div style="min-width:700px">
            <div style="display:flex;border-bottom:1px solid var(--color-border);position:sticky;top:0">${encab}</div>
            ${filas}
        </div>`;
    _bindClicks();
}
function bloqueCita(c) {
    const estadoColor = {
        programada: '#3b82f6', confirmada: '#0ea5e9',
        en_curso: '#8b5cf6', completada: '#22c55e', cancelada: '#9ca3af'
    }[c.estado] ?? '#3b82f6';
    return `
        <div class="cal-cita" data-id="${c.id}" style="cursor:pointer;background:var(--color-surface);border-left:3px solid ${estadoColor};border-radius:4px;padding:4px 8px;font-size:var(--fs-xs);box-shadow:var(--shadow-sm);min-width:140px;flex:1">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${formatoHoraMin(c.fechaHora)} · ${c.paciente}</div>
            <div style="color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                Dr. ${c.doctor ?? '—'} · ${c.servicio ?? 'Consulta'} · ${c.duracionMin}min
            </div>
            <div style="color:var(--color-text-muted);font-size:10px">Cita #${c.id}</div>
        </div>`;
}
function _bindClicks() {
    document.querySelectorAll('.cal-cita, .cal-cita-mini').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            window.location.hash = `#/citas/${el.dataset.id}`;
        });
    });
    document.querySelectorAll('.cal-franja').forEach(fr => {
        fr.addEventListener('click', () => {
            const fecha = fr.dataset.fecha;
            const hora = parseInt(fr.dataset.hora);
            const cant = parseInt(fr.dataset.cant);
            const hh = String(hora).padStart(2, '0');
            const fechaHora = `${fecha}T${hh}:00`;
            const ir = () => { window.location.hash = `#/citas/nueva/${encodeURIComponent(fechaHora)}`; };
            if (cant > 0) {
                UI.confirm(
                    `Ya hay ${cant} cita(s) en este horario. ¿Deseas agendar otra? ` +
                    `(El sistema validará que no se repita con el mismo doctor.)`,
                    ir,
                    'Agendar de todos modos'
                );
            } else {
                ir();
            }
        });
    });
}
function formatoHora(h) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${h12} ${ampm}`;
}
function formatoHoraMin(iso) {
    return new Date(iso).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
}