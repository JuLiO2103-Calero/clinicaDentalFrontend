// ============================================================
// dashboard/agenda.js — Agenda de citas agrupada por día
// ============================================================

import UI from '../../utils/ui.js';

export function renderAgenda(citas, periodo) {
    const container = document.getElementById('agenda-container');
    const titulo    = document.getElementById('titulo-agenda');
    const contador  = document.getElementById('contador-agenda');

    const labels = { dia: 'Agenda del día', semana: 'Agenda de la semana', mes: 'Agenda del mes' };
    titulo.textContent = labels[periodo];
    contador.textContent = `${citas.length} cita(s)`;

    if (!citas.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <p class="empty-state-text">Sin citas en este periodo</p>
            </div>`;
        return;
    }

    // Agrupar por día
    const porDia = {};
    citas.forEach(c => {
        const dia = UI.fecha(c.fechaHora);
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(c);
    });

    let html = '';
    for (const [, citasDia] of Object.entries(porDia)) {
        // Separador de día (solo en semana/mes)
        if (periodo !== 'dia') {
            const f = new Date(citasDia[0].fechaHora);
            const label = f.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Managua' });
            html += `
                <div style="padding:var(--sp-2) var(--sp-4);background:var(--color-bg);
                    font-size:var(--fs-xs);font-weight:600;text-transform:uppercase;
                    letter-spacing:.05em;color:var(--color-text-muted);
                    border-bottom:1px solid var(--color-border)">
                    ${label} · ${citasDia.length} cita(s)
                </div>`;
        }

        // Filas de citas
        citasDia.forEach(c => {
            const hora = new Date(c.fechaHora).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
            html += `
                <div class="agenda-row" data-id="${c.id}" style="
                    display:grid;grid-template-columns:70px 1fr 140px 100px 80px;
                    align-items:center;gap:var(--sp-3);
                    padding:var(--sp-3) var(--sp-4);border-bottom:1px solid var(--color-border);
                    cursor:pointer;transition:background var(--transition);font-size:var(--fs-sm)">
                    <span class="font-semibold">${hora}</span>
                    <div>
                        <div class="font-semibold">${c.paciente}</div>
                        <div class="text-xs text-muted">${c.servicio ?? c.motivo ?? ''}</div>
                    </div>
                    <span class="text-muted truncate">${c.doctor}</span>
                    <span>${UI.badge(c.estado)}</span>
                    <span class="text-xs text-muted">${c.duracionMin} min</span>
                </div>`;
        });
    }

    container.innerHTML = html;

    // Click para ir al detalle
    container.querySelectorAll('.agenda-row').forEach(row => {
        row.addEventListener('mouseenter', () => row.style.background = 'var(--color-bg)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => {
            window.location.hash = `#/citas/${row.dataset.id}`;
        });
    });
}
