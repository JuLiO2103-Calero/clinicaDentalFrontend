// ============================================================
// citas/detalle.js — Vista de detalle de una cita
// ============================================================
import Api from '../../core/api.js';
import State from '../../core/state.js';
import UI from '../../utils/ui.js';
import { abrirPagoDirecto } from '../pagos/modal-cobro.js';
import { abrirWhatsApp, mensajeRecordatorioCita } from '../../utils/whatsapp.js';
export async function renderDetalle(container, citaId) {
    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Cargando...</h1>
            <button class="btn btn-ghost" id="btn-volver-det">← Volver</button>
        </div>
        <div class="empty-state"><div class="spinner" style="margin:2rem auto"></div></div>`;
    document.getElementById('btn-volver-det').addEventListener('click', () => { window.location.hash = '#/citas'; });
    UI.showLoader();
    const res = await Api.get(`/api/citas/${citaId}`);
    UI.hideLoader();
    if (!res.ok) {
        container.innerHTML = `
            <div class="page-header"><h1 class="page-title">Error</h1>
                <button class="btn btn-ghost" onclick="window.location.hash='#/citas'">← Volver</button></div>
            <div class="card"><div class="card-body text-center text-danger">${res.mensaje}</div></div>`;
        return;
    }
    const c = res.datos;
    const rol = State.getUsuario()?.rol;
    const transiciones = {
        programada: ['confirmada', 'en_curso', 'cancelada', 'no_asistio'],
        confirmada: ['en_curso', 'completada', 'cancelada', 'no_asistio'],
        en_curso: ['completada', 'cancelada'],
    };
    const siguientes = transiciones[c.estado] ?? [];
    const btnLabels = {
        confirmada: '✓ Confirmar',
        en_curso: '▶ En curso',
        completada: '✅ Completar',
        cancelada: '❌ Cancelar',
        no_asistio: '🚫 No asistió',
    };
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Cita #${c.id} ${UI.badge(c.estado)}</h1>
                <p class="page-subtitle">${UI.fechaHora(c.fechaHora)} · ${c.sucursal} · ${c.duracionMin} min</p>
            </div>
            <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap">
                <button class="btn btn-ghost" id="btn-volver-det2">← Volver</button>
                ${rol !== 'doctor' && ['programada', 'confirmada'].includes(c.estado) ?
            `<button class="btn btn-outline" id="btn-editar-cita">✏️ Editar</button>` : ''}
                ${siguientes.map(e => `
                    <button class="btn ${['cancelada', 'no_asistio'].includes(e) ? 'btn-danger' : 'btn-primary'} btn-sm btn-cambiar"
                        data-estado="${e}">${btnLabels[e] ?? e}</button>`).join('')}
                ${c.estado === 'en_curso' ? `<button class="btn btn-outline btn-sm" id="btn-reg-consulta">🩺 Registrar consulta</button>` : ''}
                ${['completada', 'en_curso'].includes(c.estado) ? `<button class="btn btn-outline btn-sm" id="btn-reg-pago">💳 Registrar pago</button>` : ''}
                ${c.telefonoPaciente && ['programada', 'confirmada'].includes(c.estado) ?
            `<button class="btn btn-outline btn-sm" id="btn-whatsapp" style="border-color:#25d366;color:#128c3e">📱 Contactar al paciente</button>` : ''}
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6)">
            <div class="card">
                <div class="card-header"><h2 class="card-title">Paciente</h2></div>
                <div class="card-body">
                    ${fila('Nombre', c.paciente)}
                    ${fila('Teléfono', c.telefonoPaciente ?? '—')}
                    ${fila('Servicio', c.servicio ?? '—')}
                    ${fila('Precio base', c.precioServicio != null ? UI.moneda(c.precioServicio) : '—')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h2 class="card-title">Detalles</h2></div>
                <div class="card-body">
                    ${fila('Doctor', c.doctor)}
                    ${fila('Asistente', c.asistente ?? '—')}
                    ${fila('Motivo', c.motivo ?? '—')}
                    ${fila('Notas', c.notas ?? '—')}
                    ${fila('Creado por', c.creadoPorNombre)}
                    ${fila('Creado el', UI.fechaHora(c.creadoEn))}
                </div>
            </div>
        </div>`;
    document.getElementById('btn-volver-det2')?.addEventListener('click', () => { window.location.hash = '#/citas'; });
    document.getElementById('btn-editar-cita')?.addEventListener('click', () => { window.location.hash = `#/citas/editar/${c.id}`; });
    document.getElementById('btn-reg-consulta')?.addEventListener('click', () => { window.location.hash = `#/consultas/nueva/${c.id}`; });
    document.getElementById('btn-reg-pago')?.addEventListener('click', () => {
        if (c.pagado) { UI.toast('Esta cita ya fue cobrada', 'warning'); return; }
        abrirPagoDirecto({
            id: c.id,
            precio: c.precioServicio ?? 0,
            paciente: c.paciente,
            servicio: c.servicio ?? 'Sin servicio',
            fecha: UI.fechaHora(c.fechaHora)
        }, () => {
            UI.toast('Pago registrado', 'success');
            renderDetalle(container, citaId); // refrescar el detalle
        });
    });
    document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
        // Separar fecha y hora de la cita para el mensaje
        const dt = new Date(c.fechaHora);
        const fecha = dt.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Managua' });
        const hora = dt.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
        const mensaje = mensajeRecordatorioCita({
            paciente: c.paciente,
            fecha,
            hora,
            servicio: c.servicio
        });
        const ok = abrirWhatsApp(c.telefonoPaciente, mensaje);
        if (!ok) UI.toast('El paciente no tiene un teléfono válido registrado', 'warning');
    });
    // Botones de cambio de estado (puede haber varios): enganchar cada uno
    container.querySelectorAll('.btn-cambiar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const nuevo = btn.dataset.estado;
            const destructivo = ['cancelada', 'no_asistio'].includes(nuevo);
            const ejecutar = async () => {
                UI.showLoader();
                const res = await Api.put(`/api/citas/${citaId}/estado`, { estado: nuevo });
                UI.hideLoader();
                if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
                UI.toast(res.mensaje, 'success');
                renderDetalle(container, citaId); // refrescar
            };
            destructivo
                ? UI.confirm(`¿Cambiar la cita a "${nuevo}"? No se puede deshacer.`, ejecutar)
                : ejecutar();
        });
    });
}
function fila(label, valor) {
    return `<div style="display:flex;gap:var(--sp-3);padding:var(--sp-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm)">
        <span class="text-muted" style="min-width:120px;flex-shrink:0">${label}</span><span>${valor}</span></div>`;
}