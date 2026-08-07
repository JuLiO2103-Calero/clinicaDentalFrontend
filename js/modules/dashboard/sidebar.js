// ============================================================
// dashboard/sidebar.js — Panel lateral: estados y accesos rápidos
// ============================================================

export function crearSidebarHTML(rol) {
    return `
        <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" style="font-size:var(--fs-base)">Por estado</h2>
                </div>
                <div class="card-body" style="padding:var(--sp-4)">
                    <div id="estado-breakdown"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title" style="font-size:var(--fs-base)">Acceso rápido</h2>
                </div>
                <div class="card-body" style="padding:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-2)">
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/pacientes">👤 Buscar paciente</button>
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/citas">📅 Ver citas</button>
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/consultas">🩺 Consultas</button>
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/pagos">💳 Pagos</button>
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/caja">🏧 Caja</button>
                    <button class="btn btn-ghost w-full" style="justify-content:flex-start" data-nav="#/reportes">📊 Reportes</button>
                </div>
            </div>
        </div>`;
}

export function bindSidebar(container) {
    container.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => { window.location.hash = btn.dataset.nav; });
    });
}
