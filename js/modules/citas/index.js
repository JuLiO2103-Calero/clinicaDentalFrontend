// ============================================================
// citas/index.js — Orquestador del módulo de citas
// Enruta sub-vistas: lista, formulario, detalle
// ============================================================
import { renderLista, resetCache } from './lista.js';
import { renderFormulario }        from './formulario.js';
import { renderDetalle }           from './detalle.js';
const CitasModule = {
    render(container, hash) {
        // Nueva cita, opcionalmente con fecha/hora preseleccionada:
        // #/citas/nueva                     -> formulario vacío
        // #/citas/nueva/2026-08-08T10:00    -> formulario con esa fecha/hora
        if (hash === '#/citas/nueva') {
            renderFormulario(container, null);
        } else if (hash.startsWith('#/citas/nueva/')) {
            const fechaHora = decodeURIComponent(hash.replace('#/citas/nueva/', ''));
            renderFormulario(container, null, fechaHora);
        } else {
            const matchEdit = hash.match(/^#\/citas\/editar\/(\d+)$/);
            if (matchEdit) {
                renderFormulario(container, parseInt(matchEdit[1]));
            } else {
                const matchId = hash.match(/^#\/citas\/(\d+)$/);
                if (matchId) {
                    renderDetalle(container, parseInt(matchId[1]));
                } else {
                    renderLista(container);
                }
            }
        }
    },
    destroy() {
        resetCache();
    }
};
export default CitasModule;
