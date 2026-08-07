// ============================================================
// dashboard/stats.js — Tarjetas de contadores clickables
// ============================================================

import UI from '../../utils/ui.js';

export function renderStats(citas, periodo) {
    const labels = { dia: 'del día', semana: 'de la semana', mes: 'del mes' };
    const pl = labels[periodo];

    const programadas = citas.filter(c => c.estado === 'programada');
    const confirmadas = citas.filter(c => c.estado === 'confirmada');
    const enCurso     = citas.filter(c => c.estado === 'en_curso');
    const completadas = citas.filter(c => c.estado === 'completada');
    const canceladas  = citas.filter(c => c.estado === 'cancelada');
    const noAsistio   = citas.filter(c => c.estado === 'no_asistio');

    const stats = [
        { label: `Total ${pl}`,  val: citas.length,                              color: 'primary', filtro: null },
        { label: 'Pendientes',   val: programadas.length + confirmadas.length,    color: 'warning', filtro: ['programada', 'confirmada'] },
        { label: 'En curso',     val: enCurso.length,                             color: 'primary', filtro: ['en_curso'] },
        { label: 'Completadas',  val: completadas.length,                         color: 'success', filtro: ['completada'] },
        { label: 'Canceladas',   val: canceladas.length,                          color: 'danger',  filtro: ['cancelada'] },
        { label: 'No asistió',   val: noAsistio.length,                           color: '',        filtro: ['no_asistio'] },
    ];

    document.getElementById('stats-grid').innerHTML = stats.map((s, i) => `
        <div class="stat-card stat-clickable" data-stat-idx="${i}"
            style="cursor:pointer;transition:box-shadow var(--transition),transform var(--transition)"
            title="Clic para ver detalle">
            <div class="stat-card-label">${s.label}</div>
            <div class="stat-card-value ${s.color}" style="display:flex;align-items:baseline;gap:var(--sp-2)">
                ${s.val}
                <span style="font-size:var(--fs-xs);font-weight:400;color:var(--color-text-muted)">→ ver</span>
            </div>
        </div>`).join('');

    // Hover y clic
    document.querySelectorAll('.stat-clickable').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.boxShadow = 'var(--shadow)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseleave', () => { card.style.boxShadow = ''; card.style.transform = ''; });
        card.addEventListener('click', () => {
            const s = stats[parseInt(card.dataset.statIdx)];
            const filtradas = s.filtro ? citas.filter(c => s.filtro.includes(c.estado)) : citas;
            abrirModalCitas(s.label, filtradas);
        });
    });
}

export function renderEstados(citas) {
    const conteo = { programada: 0, confirmada: 0, en_curso: 0, completada: 0, cancelada: 0, no_asistio: 0 };
    citas.forEach(c => { if (conteo[c.estado] !== undefined) conteo[c.estado]++; });

    const estados = [
        { label: 'Programadas', key: 'programada',  color: 'var(--color-text-muted)' },
        { label: 'Confirmadas', key: 'confirmada',  color: 'var(--color-primary)' },
        { label: 'En curso',    key: 'en_curso',    color: '#856404' },
        { label: 'Completadas', key: 'completada',  color: 'var(--color-success)' },
        { label: 'Canceladas',  key: 'cancelada',   color: 'var(--color-danger)' },
        { label: 'No asistió',  key: 'no_asistio',  color: 'var(--color-text-muted)' },
    ];

    document.getElementById('estado-breakdown').innerHTML = estados.map(e => `
        <div class="estado-row" data-estado="${e.key}" style="display:flex;justify-content:space-between;align-items:center;
            padding:var(--sp-2) var(--sp-1);border-bottom:1px solid var(--color-border);
            cursor:pointer;border-radius:var(--radius-sm);transition:background var(--transition)">
            <span class="text-sm" style="color:${e.color};font-weight:500">${e.label}</span>
            <span class="font-bold" style="display:flex;align-items:center;gap:var(--sp-2)">
                ${conteo[e.key]}
                ${conteo[e.key] > 0 ? '<span style="font-size:var(--fs-xs);font-weight:400;color:var(--color-text-muted)">→</span>' : ''}
            </span>
        </div>`).join('');

    document.querySelectorAll('.estado-row').forEach(row => {
        row.addEventListener('mouseenter', () => row.style.background = 'var(--color-bg)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => {
            const f = citas.filter(c => c.estado === row.dataset.estado);
            if (!f.length) { UI.toast('Sin citas en este estado', 'info'); return; }
            const label = estados.find(e => e.key === row.dataset.estado)?.label;
            abrirModalCitas(label, f);
        });
    });
}

export function crearModalHTML() {
    return `
        <div id="modal-citas-stat" class="modal-overlay hidden">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="modal-citas-titulo">Citas</h3>
                    <button class="modal-close" id="btn-close-modal-citas">×</button>
                </div>
                <div class="modal-body" style="padding:0">
                    <div id="modal-citas-tabla"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cerrar-modal-citas">Cerrar</button>
                </div>
            </div>
        </div>`;
}

export function bindModal() {
    document.getElementById('btn-close-modal-citas')?.addEventListener('click', () => UI.closeModal('modal-citas-stat'));
    document.getElementById('btn-cerrar-modal-citas')?.addEventListener('click', () => UI.closeModal('modal-citas-stat'));
}

function abrirModalCitas(titulo, citas) {
    document.getElementById('modal-citas-titulo').textContent = `${titulo} (${citas.length})`;
    const container = document.getElementById('modal-citas-tabla');

    if (!citas.length) {
        container.innerHTML = `<div class="empty-state" style="padding:var(--sp-8)"><p class="text-muted">Sin citas</p></div>`;
        UI.openModal('modal-citas-stat');
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper" style="border:none;border-radius:0">
            <table class="table">
                <thead><tr>
                    <th>Fecha</th><th>Paciente</th><th>Doctor</th>
                    <th>Servicio</th><th>Sucursal</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>${citas.map(c => {
                    const hora = new Date(c.fechaHora).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
                    return `<tr>
                        <td><div class="font-semibold">${UI.fecha(c.fechaHora)}</div><div class="text-xs text-muted">${hora}</div></td>
                        <td><div class="font-semibold">${c.paciente}</div><div class="text-xs text-muted">${c.telefonoPaciente ?? ''}</div></td>
                        <td>${c.doctor}</td><td>${c.servicio ?? '—'}</td><td>${c.sucursal ?? '—'}</td>
                        <td>${UI.badge(c.estado)}</td>
                        <td><button class="btn btn-ghost btn-sm btn-ver-m" data-id="${c.id}">🔍 Ver</button></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>`;

    container.querySelectorAll('.btn-ver-m').forEach(btn => {
        btn.addEventListener('click', () => {
            UI.closeModal('modal-citas-stat');
            window.location.hash = `#/citas/${btn.dataset.id}`;
        });
    });

    UI.openModal('modal-citas-stat');
}

export function skeletonStats() {
    return Array(6).fill(0).map(() =>
        `<div class="stat-card"><div style="height:12px;background:var(--color-border);border-radius:4px;width:60%;margin-bottom:8px"></div><div style="height:32px;background:var(--color-border);border-radius:4px;width:40%"></div></div>`
    ).join('');
}
