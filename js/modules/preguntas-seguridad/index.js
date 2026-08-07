// preguntas-seguridad/index.js — El usuario configura sus preguntas

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';

const CANTIDAD = 3; // preguntas requeridas

const PreguntasSeguridadModule = {
    async render(container) {
        UI.showLoader();
        const [resCat, resEstado] = await Promise.all([
            Api.get('/api/cuenta/preguntas/catalogo'),
            Api.get('/api/cuenta/preguntas/estado')
        ]);
        UI.hideLoader();

        this._catalogo = resCat.ok ? resCat.datos : [];
        const yaConfiguradas = resEstado.ok && resEstado.datos.configuradas;

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Preguntas de seguridad</h1>
            </div>
            <div style="background:#e7f1ff;padding:var(--sp-3) var(--sp-4);border-radius:var(--radius);margin-bottom:var(--sp-4);font-size:var(--fs-sm)">
                ${yaConfiguradas
                    ? '✅ Ya tienes preguntas configuradas. Puedes reemplazarlas llenando el formulario de nuevo.'
                    : '⚠️ Aún no configuras tus preguntas de seguridad. Te servirán para recuperar tu contraseña si la olvidas.'}
            </div>
            <div class="card" style="max-width:560px">
                <div class="card-body">
                    <p class="text-sm text-muted mb-4">Elige ${CANTIDAD} preguntas distintas y responde cada una. Las respuestas no distinguen mayúsculas ni tildes.</p>
                    <div id="preg-form">${this._filas()}</div>
                    <button class="btn btn-primary w-full mt-3" id="btn-guardar-preg">Guardar preguntas</button>
                </div>
            </div>`;

        // Evitar que se repitan preguntas entre selects
        container.querySelectorAll('.preg-select').forEach(sel =>
            sel.addEventListener('change', () => this._actualizarOpciones(container)));
        this._actualizarOpciones(container);

        document.getElementById('btn-guardar-preg').addEventListener('click', () => this._guardar());
    },

    _filas() {
        let html = '';
        for (let i = 0; i < CANTIDAD; i++) {
            html += `
            <div class="form-group mb-3" style="padding:var(--sp-3);background:var(--color-bg);border-radius:var(--radius)">
                <label class="form-label">Pregunta ${i + 1}</label>
                <select class="form-control preg-select mb-2" data-idx="${i}">
                    <option value="">Seleccionar...</option>
                    ${this._catalogo.map(p => `<option value="${p.id}">${p.texto}</option>`).join('')}
                </select>
                <input type="text" class="form-control preg-resp" data-idx="${i}" placeholder="Tu respuesta" autocomplete="off" />
            </div>`;
        }
        return html;
    },

    _actualizarOpciones(container) {
        const seleccionadas = Array.from(container.querySelectorAll('.preg-select'))
            .map(s => s.value).filter(Boolean);
        container.querySelectorAll('.preg-select').forEach(sel => {
            const actual = sel.value;
            sel.querySelectorAll('option').forEach(op => {
                if (!op.value) return;
                // Deshabilitar si está elegida en otro select
                op.disabled = seleccionadas.includes(op.value) && op.value !== actual;
            });
        });
    },

    async _guardar() {
        const selects = Array.from(document.querySelectorAll('.preg-select'));
        const resps   = Array.from(document.querySelectorAll('.preg-resp'));

        const respuestas = selects.map((sel, i) => ({
            preguntaId: parseInt(sel.value) || 0,
            respuesta: resps[i].value.trim()
        }));

        if (respuestas.some(r => !r.preguntaId)) { UI.toast('Elige las 3 preguntas', 'warning'); return; }
        if (respuestas.some(r => r.respuesta.length < 2)) { UI.toast('Cada respuesta debe tener al menos 2 caracteres', 'warning'); return; }

        const ids = respuestas.map(r => r.preguntaId);
        if (new Set(ids).size !== ids.length) { UI.toast('No repitas la misma pregunta', 'warning'); return; }

        const btn = document.getElementById('btn-guardar-preg');
        btn.disabled = true; btn.textContent = 'Guardando…';
        UI.showLoader();
        const res = await Api.post('/api/cuenta/preguntas', { respuestas });
        UI.hideLoader();
        btn.disabled = false; btn.textContent = 'Guardar preguntas';

        if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
        UI.toast('Preguntas de seguridad guardadas', 'success');
        window.location.hash = '#/dashboard';
    },

    destroy() {}
};

export default PreguntasSeguridadModule;
