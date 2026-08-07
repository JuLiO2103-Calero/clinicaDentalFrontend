// ============================================================
// pacientes/buscar.js — Buscador de pacientes
// ============================================================

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';
import { abrirWhatsApp } from '../../utils/whatsapp.js';

export async function renderBuscar(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Pacientes</h1>
                <p class="page-subtitle">Buscar por nombre, cédula, teléfono o expediente</p>
            </div>
            <button class="btn btn-primary" id="btn-nuevo-paciente">+ Nuevo paciente</button>
        </div>

        <div class="card mb-4">
            <div class="card-body" style="padding:var(--sp-4)">
                <div style="display:flex;gap:var(--sp-3)">
                    <div class="search-input-wrapper" style="flex:1">
                        <span class="search-icon">🔍</span>
                        <input type="text" class="form-control" id="input-buscar-pac"
                            placeholder="Escribe nombre, apellido, cédula, teléfono o número de expediente..."
                            style="padding-left:2rem" autofocus />
                    </div>
                    <button class="btn btn-primary" id="btn-buscar-pac">Buscar</button>
                </div>
                <p class="text-xs text-muted mt-2">Mínimo 2 caracteres. La cédula se busca con o sin guiones.</p>
            </div>
        </div>

        <div id="resultados-pacientes">
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p class="empty-state-text">Escribe un criterio de búsqueda para encontrar pacientes</p>
            </div>
        </div>`;

    document.getElementById('btn-nuevo-paciente').addEventListener('click', () => {
        window.location.hash = '#/pacientes/nuevo';
    });

    document.getElementById('input-buscar-pac').addEventListener('keydown', e => {
        if (e.key === 'Enter') buscar();
    });

    document.getElementById('btn-buscar-pac').addEventListener('click', buscar);
}

async function buscar() {
    const q = document.getElementById('input-buscar-pac').value.trim();
    if (q.length < 2) {
        UI.toast('Escribe al menos 2 caracteres', 'warning');
        return;
    }

    UI.showLoader();
    const res = await Api.get(Api.buildUrl('/api/pacientes/buscar', { q }));
    UI.hideLoader();

    if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }

    renderResultados(res.datos ?? [], q);
}

function renderResultados(pacientes, criterio) {
    const container = document.getElementById('resultados-pacientes');

    if (!pacientes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p class="empty-state-text">No se encontraron pacientes para "${criterio}"</p>
                <button class="btn btn-outline mt-4" onclick="window.location.hash='#/pacientes/nuevo'">
                    + Registrar nuevo paciente
                </button>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom:var(--sp-3)">
            <span class="text-sm text-muted">${pacientes.length} resultado(s) para "${criterio}"</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--sp-4)">
            ${pacientes.map(p => cardPaciente(p)).join('')}
        </div>`;

    container.querySelectorAll('.card-paciente').forEach(card => {
        card.addEventListener('click', () => {
            window.location.hash = `#/pacientes/${card.dataset.id}`;
        });
    });

    container.querySelectorAll('.btn-expediente').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            window.location.hash = `#/pacientes/${btn.dataset.id}/expediente`;
        });
    });

    container.querySelectorAll('.btn-editar-pac').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            window.location.hash = `#/pacientes/editar/${btn.dataset.id}`;
        });
    });

    container.querySelectorAll('.btn-wa-buscar').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const ok = abrirWhatsApp(btn.dataset.tel);
            if (!ok) UI.toast('El teléfono no es válido', 'warning');
        });
    });
}

function cardPaciente(p) {
    const edad = p.edad != null ? `${p.edad} años` : '';
    const sexoIcon = p.sexo === 'M' ? '👨' : p.sexo === 'F' ? '👩' : '👤';

    return `
        <div class="card card-paciente" data-id="${p.id}"
            style="cursor:pointer;transition:box-shadow var(--transition),transform var(--transition)">
            <div class="card-body" style="padding:var(--sp-4)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-3)">
                    <div>
                        <div style="font-size:var(--fs-lg);font-weight:600">
                            ${sexoIcon} ${p.nombreCompleto}
                        </div>
                        <div class="text-xs text-muted mt-2">${p.numeroExpediente}</div>
                    </div>
                    ${UI.badge(p.activo ? 'activo' : 'inactivo')}
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);font-size:var(--fs-sm)">
                    ${campo('Cédula', p.cedulaFormateada ?? p.cedula ?? '—')}
                    ${campo('Teléfono', p.telefono ?? '—')}
                    ${campo('Nacimiento', p.fechaNacimiento ? UI.fecha(p.fechaNacimiento) : '—')}
                    ${campo('Edad', edad || '—')}
                    ${campo('Tipo sangre', p.tipoSangre ?? '—')}
                    ${campo('Sexo', p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : p.sexo ?? '—')}
                </div>

                <div style="margin-top:var(--sp-3);padding-top:var(--sp-2);border-top:1px solid var(--color-border);font-size:var(--fs-xs);color:var(--color-text-muted)">
                    Registrado por <strong>${p.creadoPor ?? '—'}</strong> el ${UI.fechaHora(p.creadoEn)}
                </div>

                <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);border-top:1px solid var(--color-border);padding-top:var(--sp-3)">
                    <button class="btn btn-primary btn-sm btn-expediente" data-id="${p.id}" style="flex:1">
                        📋 Expediente
                    </button>
                    ${p.telefono ? `<button class="btn btn-outline btn-sm btn-wa-buscar" data-tel="${p.telefono}" title="Contactar por WhatsApp" style="border-color:#25d366;color:#128c3e">📱</button>` : ''}
                    <button class="btn btn-outline btn-sm btn-editar-pac" data-id="${p.id}">
                        ✏️ Editar
                    </button>
                </div>
            </div>
        </div>`;
}

function campo(label, valor) {
    return `<div>
        <span class="text-muted">${label}:</span>
        <span class="font-semibold">${valor}</span>
    </div>`;
}
