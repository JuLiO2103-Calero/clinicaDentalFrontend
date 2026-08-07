// ============================================================
// pacientes/expediente.js — Expediente completo del paciente
// Con edición de historial clínico y odontograma
// ============================================================

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';
import { abrirWhatsApp } from '../../utils/whatsapp.js';

let _expedienteData = null;  // cache para refresh
let _pacienteId = null;
let _container = null;

export async function renderExpediente(container, pacienteId) {
    _container  = container;
    _pacienteId = pacienteId;

    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Cargando expediente...</h1>
            <button class="btn btn-ghost" id="btn-volver-exp">← Volver</button>
        </div>
        <div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div>`;

    document.getElementById('btn-volver-exp').addEventListener('click', () => {
        window.location.hash = '#/pacientes';
    });

    await cargarExpediente();
}

async function cargarExpediente() {
    UI.showLoader();
    const res = await Api.get(`/api/expedientes/paciente/${_pacienteId}/completo`);
    UI.hideLoader();

    if (!res.ok) {
        _container.innerHTML = `
            <div class="page-header"><h1 class="page-title">Error</h1>
                <button class="btn btn-ghost" onclick="window.location.hash='#/pacientes'">← Volver</button></div>
            <div class="card"><div class="card-body text-center text-danger">${res.mensaje}</div></div>`;
        return;
    }

    _expedienteData = res.datos;
    renderCompleto();
}

function renderCompleto() {
    const exp = _expedienteData;
    const p   = exp.paciente;
    const h   = exp.historialClinico;

    _container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">${p.nombreCompleto} ${UI.badge(p.activo ? 'activo' : 'inactivo')}</h1>
                <p class="page-subtitle">${p.numeroExpediente} · ${p.edad != null ? p.edad + ' años' : ''} · ${p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : ''}</p>
            </div>
            <div style="display:flex;gap:var(--sp-3)">
                <button class="btn btn-ghost" id="btn-volver-exp2">← Volver</button>
                <button class="btn btn-outline" id="btn-editar-pac-exp">✏️ Editar datos</button>
            </div>
        </div>

        <div style="display:flex;gap:2px;background:var(--color-bg);border-radius:var(--radius);padding:2px;margin-bottom:var(--sp-6);flex-wrap:wrap">
            <button class="btn btn-sm tab-btn active" data-tab="info">📋 General</button>
            <button class="btn btn-sm tab-btn" data-tab="historial">🩺 Historial</button>
            <button class="btn btn-sm tab-btn" data-tab="citas">📅 Citas (${exp.citas.length})</button>
            <button class="btn btn-sm tab-btn" data-tab="consultas">💊 Consultas (${exp.consultas.length})</button>
            <button class="btn btn-sm tab-btn" data-tab="pagos">💳 Pagos (${exp.pagos.length})</button>
            <button class="btn btn-sm tab-btn" data-tab="recetas">📝 Recetas (${exp.recetas.length})</button>
            <button class="btn btn-sm tab-btn" data-tab="archivos">📎 Archivos (${exp.archivos.length})</button>
            <button class="btn btn-sm tab-btn" data-tab="odontograma">🦷 Odontograma (${exp.odontograma.length})</button>
        </div>

        <div id="tab-content"></div>

        <!-- Modal editar historial -->
        <div id="modal-historial" class="modal-overlay hidden">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title">Editar historial clínico</h3>
                    <button class="modal-close" id="btn-close-hist">×</button>
                </div>
                <div class="modal-body">
                    <form id="form-historial" novalidate>
                        <div class="form-group mb-4">
                            <label class="form-label">Alergias</label>
                            <textarea class="form-control" id="hist-alergias" rows="2">${h?.alergias ?? ''}</textarea>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Enfermedades crónicas</label>
                            <textarea class="form-control" id="hist-enfermedades" rows="2">${h?.enfermedadesCronicas ?? ''}</textarea>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Medicamentos actuales</label>
                            <textarea class="form-control" id="hist-medicamentos" rows="2">${h?.medicamentosActuales ?? ''}</textarea>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Antecedentes familiares</label>
                            <textarea class="form-control" id="hist-antecedentes" rows="2">${h?.antecedentesFamiliares ?? ''}</textarea>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Hábitos</label>
                            <textarea class="form-control" id="hist-habitos" rows="2"
                                placeholder="Tabaquismo, bruxismo, etc.">${h?.habitos ?? ''}</textarea>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Observaciones generales</label>
                            <textarea class="form-control" id="hist-observaciones" rows="2">${h?.observacionesGenerales ?? ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cancel-hist">Cancelar</button>
                    <button class="btn btn-primary" id="btn-save-hist">Guardar cambios</button>
                </div>
            </div>
        </div>

        <!-- Modal agregar diente al odontograma -->
        <div id="modal-odonto" class="modal-overlay hidden">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Registrar diente</h3>
                    <button class="modal-close" id="btn-close-odonto">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-row mb-4">
                        <div class="form-group">
                            <label class="form-label">Número de diente (FDI) <span class="required">*</span></label>
                            <input type="number" class="form-control" id="odonto-diente" min="11" max="48" placeholder="Ej: 16" />
                            <span class="form-hint">Cuadrantes: 11-18, 21-28, 31-38, 41-48</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select class="form-control" id="odonto-estado">
                                <option value="sano">Sano</option>
                                <option value="caries">Caries</option>
                                <option value="resina">Resina / Empaste</option>
                                <option value="corona">Corona</option>
                                <option value="extraccion">Extracción</option>
                                <option value="endodoncia">Endodoncia</option>
                                <option value="fractura">Fractura</option>
                                <option value="ausente">Ausente</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notas</label>
                        <input type="text" class="form-control" id="odonto-notas" placeholder="Observaciones del diente..." />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cancel-odonto">Cancelar</button>
                    <button class="btn btn-primary" id="btn-save-odonto">Guardar</button>
                </div>
            </div>
        </div>`;

    // Bind tabs
    const tabs = {
        info:        () => renderInfo(p),
        historial:   () => renderHistorial(h),
        citas:       () => renderCitas(exp.citas),
        consultas:   () => renderConsultas(exp.consultas),
        pagos:       () => renderPagos(exp.pagos),
        recetas:     () => renderRecetas(exp.recetas),
        archivos:    () => renderArchivos(exp.archivos),
        odontograma: () => renderOdontograma(exp.odontograma),
    };

    let activeTab = 'info';

    _container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            _container.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = '';
                b.style.color = '';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--color-primary)';
            btn.style.color = '#fff';
            activeTab = btn.dataset.tab;
            document.getElementById('tab-content').innerHTML = tabs[activeTab]();
            bindTabEvents(activeTab);
        });
        if (btn.dataset.tab === 'info') {
            btn.style.background = 'var(--color-primary)';
            btn.style.color = '#fff';
        }
    });

    document.getElementById('tab-content').innerHTML = tabs.info();

    // Botones principales
    document.getElementById('btn-volver-exp2').addEventListener('click', () => { window.location.hash = '#/pacientes'; });
    document.getElementById('btn-editar-pac-exp').addEventListener('click', () => {
        window.location.hash = `#/pacientes/editar/${_pacienteId}`;
    });
    document.getElementById('btn-wa-exp')?.addEventListener('click', e => {
        const ok = abrirWhatsApp(e.currentTarget.dataset.tel);
        if (!ok) UI.toast('El teléfono no es válido', 'warning');
    });

    // Modal historial
    document.getElementById('btn-close-hist').addEventListener('click', () => UI.closeModal('modal-historial'));
    document.getElementById('btn-cancel-hist').addEventListener('click', () => UI.closeModal('modal-historial'));
    document.getElementById('btn-save-hist').addEventListener('click', guardarHistorial);

    // Modal odontograma
    document.getElementById('btn-close-odonto').addEventListener('click', () => UI.closeModal('modal-odonto'));
    document.getElementById('btn-cancel-odonto').addEventListener('click', () => UI.closeModal('modal-odonto'));
    document.getElementById('btn-save-odonto').addEventListener('click', guardarOdontograma);
}

function bindTabEvents(tab) {
    if (tab === 'historial') {
        document.getElementById('btn-editar-historial')?.addEventListener('click', () => {
            UI.openModal('modal-historial');
        });
    }
    if (tab === 'odontograma') {
        document.getElementById('btn-agregar-diente')?.addEventListener('click', () => {
            document.getElementById('odonto-diente').value = '';
            document.getElementById('odonto-estado').value = 'sano';
            document.getElementById('odonto-notas').value = '';
            UI.openModal('modal-odonto');
        });
    }
}

async function guardarHistorial() {
    const h = _expedienteData.historialClinico;
    if (!h) { UI.toast('No hay expediente para editar', 'error'); return; }

    const body = {
        alergias:               document.getElementById('hist-alergias').value.trim() || null,
        enfermedadesCronicas:   document.getElementById('hist-enfermedades').value.trim() || null,
        medicamentosActuales:   document.getElementById('hist-medicamentos').value.trim() || null,
        antecedentesFamiliares: document.getElementById('hist-antecedentes').value.trim() || null,
        habitos:                document.getElementById('hist-habitos').value.trim() || null,
        observacionesGenerales: document.getElementById('hist-observaciones').value.trim() || null,
    };

    UI.showLoader();
    const res = await Api.put(`/api/expedientes/${h.id}`, body);
    UI.hideLoader();

    UI.closeModal('modal-historial');

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    await cargarExpediente(); // recargar todo
}

async function guardarOdontograma() {
    const h = _expedienteData.historialClinico;
    if (!h) { UI.toast('No hay expediente', 'error'); return; }

    const diente = parseInt(document.getElementById('odonto-diente').value);
    const estado = document.getElementById('odonto-estado').value;
    const notas  = document.getElementById('odonto-notas').value.trim() || null;

    if (!diente || diente < 11 || diente > 48) {
        UI.toast('Número de diente inválido (11-48 en notación FDI)', 'error');
        return;
    }

    UI.showLoader();
    const res = await Api.put(`/api/expedientes/${h.id}/odontograma`, {
        numeroDiente: diente,
        estado,
        notas
    });
    UI.hideLoader();

    UI.closeModal('modal-odonto');

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
    UI.toast(res.mensaje, 'success');
    await cargarExpediente();
}

// ================================================================
// TABS
// ================================================================

function renderInfo(p) {
    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6)">
            <div class="card">
                <div class="card-header"><h2 class="card-title">Datos personales</h2></div>
                <div class="card-body">
                    ${fila('Nombre', p.nombreCompleto)}
                    ${fila('Cédula', p.cedulaFormateada ?? p.cedula ?? '—')}
                    ${fila('Fecha nac.', p.fechaNacimiento ? UI.fecha(p.fechaNacimiento) : '—')}
                    ${fila('Edad', p.edad != null ? p.edad + ' años' : '—')}
                    ${fila('Sexo', p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : p.sexo ?? '—')}
                    ${fila('Tipo sangre', p.tipoSangre ?? '—')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h2 class="card-title">Contacto</h2></div>
                <div class="card-body">
                    ${fila('Teléfono', p.telefono ?? '—')}
                    ${fila('Tel. emergencia', p.telefonoEmergencia ?? '—')}
                    ${fila('Email', p.email ?? '—')}
                    ${fila('Dirección', p.direccion ?? '—')}
                    ${fila('Expediente', p.numeroExpediente)}
                    ${fila('Registrado por', p.creadoPor ?? '—')}
                    ${fila('Fecha registro', UI.fechaHora(p.creadoEn))}
                    ${p.telefono ? `<button class="btn btn-outline btn-sm mt-3" id="btn-wa-exp" data-tel="${p.telefono}" style="border-color:#25d366;color:#128c3e">📱 Contactar por WhatsApp</button>` : ''}
                </div>
            </div>
        </div>`;
}

function renderHistorial(h) {
    return `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Historial clínico</h2>
                <button class="btn btn-outline btn-sm" id="btn-editar-historial">✏️ Editar historial</button>
            </div>
            <div class="card-body">
                ${h ? `
                    ${seccion('Alergias', h.alergias)}
                    ${seccion('Enfermedades crónicas', h.enfermedadesCronicas)}
                    ${seccion('Medicamentos actuales', h.medicamentosActuales)}
                    ${seccion('Antecedentes familiares', h.antecedentesFamiliares)}
                    ${seccion('Hábitos', h.habitos)}
                    ${seccion('Observaciones generales', h.observacionesGenerales)}
                    <div class="text-xs text-muted mt-4">Última actualización: ${UI.fechaHora(h.actualizadoEn)}</div>
                ` : '<p class="text-muted">Sin historial clínico registrado. Haz clic en "Editar historial" para agregar información.</p>'}
            </div>
        </div>`;
}

function renderCitas(citas) {
    if (!citas.length) return emptyTab('📅', 'No hay citas registradas');
    return `<div class="card"><div class="table-wrapper" style="border:none">
        <table class="table"><thead><tr>
            <th>Fecha</th><th>Servicio</th><th>Doctor</th><th>Sucursal</th><th>Estado</th><th>Motivo</th>
        </tr></thead><tbody>${citas.map(c => `<tr>
            <td style="white-space:nowrap">${UI.fechaHora(c.fechaHora)}</td>
            <td>${c.servicio ?? '—'}</td><td>${c.doctor}</td><td>${c.sucursal ?? '—'}</td>
            <td>${UI.badge(c.estado)}</td><td class="text-sm">${c.motivo ?? '—'}</td>
        </tr>`).join('')}</tbody></table></div></div>`;
}

function renderConsultas(consultas) {
    if (!consultas.length) return emptyTab('💊', 'No hay consultas registradas');
    return consultas.map(con => `
        <div class="card mb-4">
            <div class="card-header">
                <h2 class="card-title" style="font-size:var(--fs-base)">
                    ${UI.fecha(con.fechaConsulta)} — Dr. ${con.doctor}
                </h2>
            </div>
            <div class="card-body">
                ${seccion('Motivo', con.motivoConsulta)}
                ${seccion('Exploración', con.exploracionFisica)}
                ${seccion('Diagnóstico', con.diagnostico)}
                ${seccion('Tratamiento', con.tratamiento)}
                ${seccion('Observaciones', con.observaciones)}
                ${con.proximaCita ? `<div class="text-sm mt-2"><strong>Próxima cita:</strong> ${UI.fecha(con.proximaCita)}</div>` : ''}
                ${con.dientesTratados.length ? `
                    <h4 style="font-size:var(--fs-sm);font-weight:600;margin-top:var(--sp-4);margin-bottom:var(--sp-2)">Dientes tratados</h4>
                    <div class="table-wrapper"><table class="table">
                        <thead><tr><th>Diente</th><th>Procedimiento</th><th>Antes</th><th>Después</th><th>Notas</th></tr></thead>
                        <tbody>${con.dientesTratados.map(d => `<tr>
                            <td class="font-semibold">${d.numeroDiente}</td>
                            <td>${d.procedimiento ?? '—'}</td><td>${d.estadoPrevio ?? '—'}</td>
                            <td>${d.estadoPosterior ?? '—'}</td><td class="text-sm">${d.notas ?? '—'}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>` : ''}
            </div>
        </div>`).join('');
}

function renderPagos(pagos) {
    if (!pagos.length) return emptyTab('💳', 'No hay pagos registrados');
    return `<div class="card"><div class="table-wrapper" style="border:none">
        <table class="table"><thead><tr>
            <th>Fecha</th><th>Monto</th><th>Descuento</th><th>Total</th><th>Método</th><th>Recibido por</th><th>Estado</th>
        </tr></thead><tbody>${pagos.map(pg => `
            <tr style="${pg.anulado ? 'opacity:0.5;text-decoration:line-through' : ''}">
                <td style="white-space:nowrap">${UI.fechaHora(pg.fechaPago)}</td>
                <td>${UI.moneda(pg.monto)}</td>
                <td>${pg.descuento > 0 ? UI.moneda(pg.descuento) : '—'}</td>
                <td class="font-semibold">${UI.moneda(pg.totalCobrado)}</td>
                <td>${pg.metodoPago}</td><td>${pg.recibidoPor}</td>
                <td>${pg.anulado ? UI.badge('cancelada') : UI.badge('completada')}</td>
            </tr>`).join('')}</tbody></table></div></div>`;
}

function renderRecetas(recetas) {
    if (!recetas.length) return emptyTab('📝', 'No hay recetas registradas');
    return recetas.map(r => `
        <div class="card mb-4">
            <div class="card-header">
                <h2 class="card-title" style="font-size:var(--fs-base)">Receta — ${UI.fecha(r.fecha)} — Dr. ${r.doctor}</h2>
            </div>
            <div class="card-body">
                ${r.indicaciones ? `<p class="text-sm mb-4"><strong>Indicaciones:</strong> ${r.indicaciones}</p>` : ''}
                <div class="table-wrapper"><table class="table">
                    <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead>
                    <tbody>${r.detalle.map(d => `<tr>
                        <td class="font-semibold">${d.medicamento}</td>
                        <td>${d.dosis ?? '—'}</td><td>${d.frecuencia ?? '—'}</td><td>${d.duracion ?? '—'}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
            </div>
        </div>`).join('');
}

function renderArchivos(archivos) {
    if (!archivos.length) return emptyTab('📎', 'No hay archivos adjuntos');
    return `<div class="card"><div class="table-wrapper" style="border:none">
        <table class="table"><thead><tr><th>Tipo</th><th>Nombre</th><th>Fecha</th><th>Ruta</th></tr></thead>
        <tbody>${archivos.map(a => `<tr>
            <td>${UI.badge(a.tipo)}</td><td class="font-semibold">${a.nombreArchivo}</td>
            <td>${UI.fechaHora(a.subidoEn)}</td>
            <td class="text-xs text-muted truncate" style="max-width:200px">${a.rutaArchivo}</td>
        </tr>`).join('')}</tbody></table></div></div>`;
}

function renderOdontograma(dientes) {
    const cuadrantes = {
        1: { nombre: 'Superior derecho', dientes: [] },
        2: { nombre: 'Superior izquierdo', dientes: [] },
        3: { nombre: 'Inferior izquierdo', dientes: [] },
        4: { nombre: 'Inferior derecho', dientes: [] },
    };
    dientes.forEach(d => {
        const c = Math.floor(d.numeroDiente / 10);
        if (cuadrantes[c]) cuadrantes[c].dientes.push(d);
    });

    return `
        <div style="margin-bottom:var(--sp-4)">
            <button class="btn btn-primary btn-sm" id="btn-agregar-diente">+ Agregar / actualizar diente</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
            ${Object.entries(cuadrantes).map(([num, cuad]) => `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title" style="font-size:var(--fs-sm)">Q${num} — ${cuad.nombre}</h2>
                    </div>
                    <div class="card-body" style="padding:var(--sp-3)">
                        ${cuad.dientes.length ? cuad.dientes.map(d => `
                            <div style="display:flex;justify-content:space-between;align-items:center;
                                        padding:var(--sp-1) 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm)">
                                <span class="font-semibold">Diente ${d.numeroDiente}</span>
                                <span>${UI.badge(d.estado ?? 'sano')}</span>
                            </div>
                            ${d.notas ? `<div class="text-xs text-muted" style="padding-bottom:var(--sp-1)">${d.notas}</div>` : ''}
                        `).join('') : '<p class="text-sm text-muted">Sin registros</p>'}
                    </div>
                </div>`).join('')}
        </div>`;
}

// ================================================================
// Helpers
// ================================================================

function fila(label, valor) {
    return `<div style="display:flex;gap:var(--sp-3);padding:var(--sp-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm)">
        <span class="text-muted" style="min-width:130px;flex-shrink:0">${label}</span><span>${valor}</span></div>`;
}

function seccion(titulo, contenido) {
    return `<div style="margin-bottom:var(--sp-3)">
        <span class="text-sm font-semibold" style="color:var(--color-text-muted)">${titulo}</span>
        <p class="text-sm mt-2">${contenido ?? '<span class="text-muted">No registrado</span>'}</p>
    </div>`;
}

function emptyTab(icon, msg) {
    return `<div class="card"><div class="empty-state"><div class="empty-state-icon">${icon}</div><p class="empty-state-text">${msg}</p></div></div>`;
}
