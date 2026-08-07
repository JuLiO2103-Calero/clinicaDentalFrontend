// ============================================================
// pacientes/index.js — Orquestador del módulo de pacientes
// Rutas: #/pacientes, #/pacientes/nuevo, #/pacientes/editar/{id},
//        #/pacientes/{id}, #/pacientes/{id}/expediente
// ============================================================

import { renderBuscar }      from './buscar.js';
import { renderFormulario }  from './formulario.js';
import { renderExpediente }  from './expediente.js';

const PacientesModule = {
    render(container, hash) {
        // Nuevo paciente
        if (hash === '#/pacientes/nuevo') {
            renderFormulario(container, null);
            return;
        }

        // Editar paciente
        const matchEdit = hash.match(/^#\/pacientes\/editar\/(\d+)$/);
        if (matchEdit) {
            renderFormulario(container, parseInt(matchEdit[1]));
            return;
        }

        // Expediente completo
        const matchExp = hash.match(/^#\/pacientes\/(\d+)\/expediente$/);
        if (matchExp) {
            renderExpediente(container, parseInt(matchExp[1]));
            return;
        }

        // Detalle simple -> redirigir a expediente (es más útil)
        const matchId = hash.match(/^#\/pacientes\/(\d+)$/);
        if (matchId) {
            window.location.hash = `#/pacientes/${matchId[1]}/expediente`;
            return;
        }

        // Buscador (vista principal)
        renderBuscar(container);
    },

    destroy() {}
};

export default PacientesModule;
