// ============================================================
// citas/lista.js — Lista de citas con búsqueda y filtros
// - Texto: busca por paciente (nombre, cédula, expediente)
// - Rango de fechas: siempre visible, aplica a todo
// - Filtros avanzados: doctor, estado
// - Pills: accesos rápidos que setean rango + estado
// - Sucursal: admin ve todas o una; asistente/doctor solo la suya
// ============================================================

import Api      from '../../core/api.js';
import State    from '../../core/state.js';
import Sucursal from '../../core/sucursal.js';
import UI       from '../../utils/ui.js';

let _usuarios = null;

export async function renderLista(container) {
    const rol = State.getUsuario()?.rol;
    const hoy = new Date().toISOString().split('T')[0];

    if (!_usuarios) {
        const res = await Api.get('/api/usuarios/personal');
        _usuarios = res.ok ? res.datos : [];
    }
    const doctores = _usuarios.filter(u => u.rol === 'doctor' && u.activo);
    const opsDocs  = doctores.map(d => `<option value="${d.id}">${d.nombreCompleto}</option>`).join('');

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Citas</h1>
                <p class="page-subtitle">Gestión y búsqueda de citas</p>
            </div>
            ${rol !== 'doctor' ? `<button class="btn btn-primary" id="btn-nueva-cita">+ Nueva cita</button>` : ''}
        </div>

        <div class="card mb-4">
            <div class="card-body" style="padding:var(--sp-4)">

                <!-- Barra de búsqueda por texto -->
                <div style="display:flex;gap:var(--sp-3);margin-bottom:var(--sp-4)">
                    <div class="search-input-wrapper" style="flex:1">
                        <span class="search-icon">🔍</span>
                        <input type="text" class="form-control" id="f-texto"
                            placeholder="Buscar por nombre, cédula o expediente del paciente..."
                            style="padding-left:2rem" />
                    </div>
                    <button class="btn btn-primary" id="btn-buscar">Buscar</button>
                    <button class="btn btn-ghost" id="btn-limpiar" title="Limpiar filtros">✕</button>
                </div>

                <!-- Rango de fechas (siempre visible) -->
                <div style="display:flex;align-items:flex-end;gap:var(--sp-3);margin-bottom:var(--sp-3);
                            padding:var(--sp-3);background:var(--color-bg);border-radius:var(--radius);flex-wrap:wrap">
                    <div class="form-group" style="min-width:150px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Fecha inicio</label>
                        <input type="date" class="form-control" id="f-inicio" value="${hoy}" />
                    </div>
                    <div class="form-group" style="min-width:150px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Fecha fin</label>
                        <input type="date" class="form-control" id="f-fin" value="${hoy}" />
                    </div>
                    <div class="form-group" style="min-width:140px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Doctor</label>
                        <select class="form-control" id="f-doctor">
                            <option value="">Todos</option>
                            ${opsDocs}
                        </select>
                    </div>
                    <div class="form-group" style="min-width:140px">
                        <label class="form-label" style="font-size:var(--fs-xs)">Estado</label>
                        <select class="form-control" id="f-estado">
                            <option value="">Todos</option>
                            <option value="programada">Programada</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="en_curso">En curso</option>
                            <option value="completada">Completada</option>
                            <option value="cancelada">Cancelada</option>
                            <option value="no_asistio">No asistió</option>
                        </select>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-filtrar" style="height:36px">
                        Filtrar
                    </button>
                </div>

                <!-- Pills de acceso rápido -->
                <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
                    <button class="btn btn-sm filtro-rapido active-pill" data-filtro="pendientes">📋 Pendientes de hoy</button>
                    <button class="btn btn-sm filtro-rapido" data-filtro="hoy">📅 Hoy (todas)</button>
                    <button class="btn btn-sm filtro-rapido" data-filtro="semana">📆 Esta semana</button>
                    <button class="btn btn-sm filtro-rapido" data-filtro="mes">📅 Este mes</button>
                    <button class="btn btn-sm filtro-rapido" data-filtro="completadas">✅ Completadas del mes</button>
                    <button class="btn btn-sm filtro-rapido" data-filtro="canceladas">❌ Canceladas del mes</button>
                </div>
            </div>
        </div>

        <!-- Resultados -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title" style="font-size:var(--fs-base)" id="titulo-resultados">Citas</h2>
                <span class="text-sm text-muted" id="contador-resultados"></span>
            </div>
            <div id="tabla-citas"><div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div></div>
        </div>

        <!-- Modal cambiar estado -->
        <div id="modal-estado" class="modal-overlay hidden">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Cambiar estado</h3><button class="modal-close" id="btn-close-estado">×</button>
                </div>
                <div class="modal-body">
                    <p class="text-sm text-muted mb-4" id="modal-estado-desc"></p>
                    <div class="form-group"><label class="form-label">Nuevo estado <span class="required">*</span></label>
                        <select class="form-control" id="select-estado"></select></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cancel-estado">Cancelar</button>
                    <button class="btn btn-primary" id="btn-save-estado">Guardar</button>
                </div>
            </div>
        </div>`;

    actualizarPills('pendientes');

    // Eventos
    document.getElementById('btn-nueva-cita')?.addEventListener('click', () => { window.location.hash = '#/citas/nueva'; });
    document.getElementById('f-texto').addEventListener('keydown', e => { if (e.key === 'Enter') buscarPorTexto(); });
    document.getElementById('btn-buscar').addEventListener('click', () => buscarPorTexto());
    document.getElementById('btn-filtrar').addEventListener('click', () => filtrarPorCampos());
    document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros);

    // Cuando el usuario toca las fechas manualmente, desactivar pills
    // y resetear estado/doctor a "Todos" para evitar confusión
    document.getElementById('f-inicio').addEventListener('change', () => {
        actualizarPills(null);
        document.getElementById('f-estado').value = '';
        document.getElementById('f-doctor').value = '';
    });
    document.getElementById('f-fin').addEventListener('change', () => {
        actualizarPills(null);
        document.getElementById('f-estado').value = '';
        document.getElementById('f-doctor').value = '';
    });

    container.querySelectorAll('.filtro-rapido').forEach(btn => {
        btn.addEventListener('click', () => {
            actualizarPills(btn.dataset.filtro);
            aplicarFiltroRapido(btn.dataset.filtro);
        });
    });

    document.getElementById('btn-close-estado').addEventListener('click', () => UI.closeModal('modal-estado'));
    document.getElementById('btn-cancel-estado').addEventListener('click', () => UI.closeModal('modal-estado'));
    document.getElementById('btn-save-estado').addEventListener('click', guardarEstado);

    // Escuchar cambio de sucursal del admin
    window.addEventListener('sucursal-changed', () => {
        const pillActivo = document.querySelector('.filtro-rapido[style*="var(--color-primary)"]');
        if (pillActivo) {
            aplicarFiltroRapido(pillActivo.dataset.filtro);
        } else {
            filtrarPorCampos();
        }
    });

    // Carga inicial
    aplicarFiltroRapido('pendientes');
}

// ================================================================
// BÚSQUEDA POR TEXTO (ignora fechas, estado y doctor)
// ================================================================
async function buscarPorTexto() {
    const texto = document.getElementById('f-texto')?.value.trim();
    if (!texto || texto.length < 2) {
        UI.toast('Escribe al menos 2 caracteres', 'warning');
        return;
    }

    actualizarPills(null);

    UI.showLoader();
    const resPac = await Api.get(Api.buildUrl('/api/pacientes/buscar', { q: texto }));

    if (!resPac.ok || !resPac.datos?.length) {
        UI.hideLoader();
        document.getElementById('titulo-resultados').textContent = `Sin resultados para "${texto}"`;
        document.getElementById('contador-resultados').textContent = '0 cita(s)';
        renderTabla([]);
        return;
    }

    const suc = Sucursal.getSucursalFiltro();
    const ids = new Set(resPac.datos.map(p => p.id));

    if (resPac.datos.length === 1) {
        const pac = resPac.datos[0];
        document.getElementById('titulo-resultados').textContent = `Citas de ${pac.nombreCompleto}`;
        const citas = await fetchCitas({ pacienteId: pac.id, sucursalId: suc });
        UI.hideLoader();
        renderTabla(citas);
    } else {
        document.getElementById('titulo-resultados').textContent =
            `Resultados para "${texto}" (${resPac.datos.length} pacientes)`;
        const citas = await fetchCitas({ sucursalId: suc });
        UI.hideLoader();
        renderTabla(citas.filter(c => ids.has(c.pacienteId)));
    }
}

// ================================================================
// FILTRAR POR CAMPOS (rango de fechas + doctor + estado)
// ================================================================
function filtrarPorCampos() {
    const inicio = document.getElementById('f-inicio')?.value || null;
    const fin    = document.getElementById('f-fin')?.value    || null;
    const doctor = document.getElementById('f-doctor')?.value || null;
    const estado = document.getElementById('f-estado')?.value || null;
    const suc    = Sucursal.getSucursalFiltro();

    // Limpiar texto para que no interfiera
    document.getElementById('f-texto').value = '';
    actualizarPills(null);

    let titulo = 'Resultados de búsqueda';
    if (inicio && fin && inicio !== fin) {
        titulo = `Citas del ${inicio} al ${fin}`;
    } else if (inicio) {
        titulo = `Citas del ${inicio}`;
    }
    if (estado) titulo += ` · ${estado}`;

    document.getElementById('titulo-resultados').textContent = titulo;
    ejecutarBusqueda({ estado, fechaInicio: inicio, fechaFin: fin, doctorId: doctor, sucursalId: suc });
}

// ================================================================
// PILLS (accesos rápidos con fechas y estado predefinidos)
// ================================================================
function actualizarPills(activo) {
    document.querySelectorAll('.filtro-rapido').forEach(btn => {
        const a = btn.dataset.filtro === activo;
        btn.style.background = a ? 'var(--color-primary)' : 'var(--color-bg)';
        btn.style.color = a ? '#fff' : 'var(--color-text)';
        btn.style.border = a ? '1px solid var(--color-primary)' : '1px solid var(--color-border)';
    });
}

function aplicarFiltroRapido(tipo) {
    const hoy  = new Date().toISOString().split('T')[0];
    const semI = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d.toISOString().split('T')[0]; })();
    const semF = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()+6)%7) + 6); return d.toISOString().split('T')[0]; })();
    const mesI = hoy.slice(0,8) + '01';
    const mesF = (() => { const d = new Date(); d.setMonth(d.getMonth()+1,0); return d.toISOString().split('T')[0]; })();

    const filtros = {
        pendientes:  { estado: 'programada', inicio: hoy,  fin: hoy,  titulo: 'Pendientes de hoy' },
        hoy:         { estado: null,         inicio: hoy,  fin: hoy,  titulo: 'Todas las citas de hoy' },
        semana:      { estado: null,         inicio: semI, fin: semF, titulo: 'Citas de esta semana' },
        mes:         { estado: null,         inicio: mesI, fin: mesF, titulo: 'Citas de este mes' },
        completadas: { estado: 'completada', inicio: mesI, fin: mesF, titulo: 'Completadas del mes' },
        canceladas:  { estado: 'cancelada',  inicio: mesI, fin: mesF, titulo: 'Canceladas del mes' },
    };

    const f = filtros[tipo]; if (!f) return;

    // Actualizar los campos visibles para que el usuario sepa qué está viendo
    document.getElementById('f-texto').value  = '';
    document.getElementById('f-estado').value = f.estado ?? '';
    document.getElementById('f-doctor').value = '';
    document.getElementById('f-inicio').value = f.inicio;
    document.getElementById('f-fin').value    = f.fin;
    document.getElementById('titulo-resultados').textContent = f.titulo;

    ejecutarBusqueda({
        estado:      f.estado,
        fechaInicio: f.inicio,
        fechaFin:    f.fin,
        sucursalId:  Sucursal.getSucursalFiltro()
    });
}

// ================================================================
// EJECUCIÓN COMÚN
// ================================================================
async function ejecutarBusqueda(params) { renderTabla(await fetchCitas(params)); }

async function fetchCitas(params) {
    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/citas', params));
    UI.hideLoader();
    if (!res.ok) { UI.toast(res.mensaje, 'error'); return []; }
    return res.datos ?? [];
}

function limpiarFiltros() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('f-texto').value  = '';
    document.getElementById('f-doctor').value = '';
    document.getElementById('f-estado').value = '';
    document.getElementById('f-inicio').value = hoy;
    document.getElementById('f-fin').value    = hoy;
    actualizarPills('pendientes');
    aplicarFiltroRapido('pendientes');
}

// ================================================================
// TABLA DE RESULTADOS
// ================================================================
function renderTabla(citas) {
    const container = document.getElementById('tabla-citas');
    document.getElementById('contador-resultados').textContent = `${citas.length} cita(s)`;

    if (!citas.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><p class="empty-state-text">No se encontraron citas</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper" style="border:none;border-radius:0">
            <table class="table"><thead><tr>
                <th>Fecha</th><th>Paciente</th><th>Doctor</th><th>Servicio</th><th>Sucursal</th><th>Estado</th><th>Acciones</th>
            </tr></thead><tbody>${citas.map(c => {
                const hora = new Date(c.fechaHora).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
                return `<tr>
                    <td><div class="font-semibold">${UI.fecha(c.fechaHora)}</div><div class="text-xs text-muted">${hora}</div></td>
                    <td><div class="font-semibold">${c.paciente}</div><div class="text-xs text-muted">${c.telefonoPaciente ?? ''}</div></td>
                    <td>${c.doctor}</td><td>${c.servicio ?? '—'}</td><td>${c.sucursal}</td>
                    <td>${UI.badge(c.estado)}</td>
                    <td><div style="display:flex;gap:4px">
                        <button class="btn btn-ghost btn-sm btn-ver" data-id="${c.id}">🔍</button>
                        <button class="btn btn-ghost btn-sm btn-estado" data-id="${c.id}" data-estado="${c.estado}">✏️</button>
                    </div></td>
                </tr>`;
            }).join('')}</tbody></table>
        </div>`;

    container.querySelectorAll('.btn-ver').forEach(b => b.addEventListener('click', () => { window.location.hash = `#/citas/${b.dataset.id}`; }));
    container.querySelectorAll('.btn-estado').forEach(b => b.addEventListener('click', () => abrirModalEstado(b.dataset.id, b.dataset.estado)));
}

// ================================================================
// MODAL CAMBIAR ESTADO
// ================================================================
let _citaIdEstado = null;

function abrirModalEstado(citaId, estadoActual) {
    _citaIdEstado = citaId;
    document.getElementById('modal-estado-desc').innerHTML = `Cita <strong>#${citaId}</strong> — actual: ${UI.badge(estadoActual)}`;
    const trans = { programada: ['confirmada','en_curso','cancelada','no_asistio'], confirmada: ['en_curso','completada','cancelada','no_asistio'], en_curso: ['completada','cancelada'] };
    const ops = trans[estadoActual] ?? [];
    const sel = document.getElementById('select-estado');
    sel.innerHTML = ops.length ? ops.map(e => `<option value="${e}">${e}</option>`).join('') : '<option disabled selected>Estado final</option>';
    document.getElementById('btn-save-estado').disabled = !ops.length;
    UI.openModal('modal-estado');
}

async function guardarEstado() {
    const estado = document.getElementById('select-estado').value; if (!estado) return;
    UI.showLoader();
    const res = await Api.put(`/api/citas/${_citaIdEstado}/estado`, { estado });
    UI.hideLoader();
    UI.closeModal('modal-estado');
    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    // Refrescar con el último pill activo o con los filtros
    const pillActivo = document.querySelector('.filtro-rapido[style*="var(--color-primary)"]');
    if (pillActivo) {
        aplicarFiltroRapido(pillActivo.dataset.filtro);
    } else {
        filtrarPorCampos();
    }
}

export function resetCache() { _usuarios = null; }
