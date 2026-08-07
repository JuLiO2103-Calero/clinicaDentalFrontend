import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';

const ConsultasModule = {
    render(container, hash) {
        const matchNew = hash.match(/^#\/consultas\/nueva\/(\d+)$/);
        if (matchNew) return this._renderForm(container, parseInt(matchNew[1]));
        const matchId = hash.match(/^#\/consultas\/(\d+)$/);
        if (matchId) return this._renderDetalle(container, parseInt(matchId[1]));
        this._renderInfo(container);
    },

    _renderInfo(container) {
        container.innerHTML = `
            <div class="page-header"><h1 class="page-title">Consultas</h1></div>
            <div class="card"><div class="card-body" style="padding:var(--sp-6)">
                <p class="text-sm">Para registrar una consulta:</p>
                <ol style="margin:var(--sp-3) 0 0 var(--sp-4);font-size:var(--fs-sm);line-height:1.8">
                    <li>Ve a <a href="#/citas" style="color:var(--color-primary);font-weight:500">Citas</a></li>
                    <li>Cambia una cita a estado <strong>"En curso"</strong></li>
                    <li>Desde el detalle de la cita, haz clic en <strong>"Registrar consulta"</strong></li>
                </ol>
                <p class="text-sm text-muted mt-4">Las consultas registradas se ven en el expediente de cada paciente.</p>
            </div></div>`;
    },

    async _renderForm(container, citaId) {
        UI.showLoader();
        const resCita = await Api.get('/api/citas/' + citaId);
        UI.hideLoader();
        if (!resCita.ok) { container.innerHTML = `<div class="card"><div class="card-body text-danger">${resCita.mensaje}</div></div>`; return; }
        const cita = resCita.datos;

        container.innerHTML = `
            <div class="page-header">
                <div><h1 class="page-title">Nueva consulta</h1>
                    <p class="page-subtitle">Cita #${cita.id} · ${cita.paciente} · ${UI.fechaHora(cita.fechaHora)}</p></div>
                <button class="btn btn-ghost" id="btn-volver-con">← Volver</button>
            </div>
            <div class="card" style="max-width:740px"><div class="card-body">
                <form id="form-consulta" novalidate>
                    <div class="form-group mb-4"><label class="form-label">Motivo de consulta</label>
                        <textarea class="form-control" id="con-motivo" rows="2">${cita.motivo ?? ''}</textarea></div>
                    <div class="form-group mb-4"><label class="form-label">Exploración física</label>
                        <textarea class="form-control" id="con-exploracion" rows="2"></textarea></div>
                    <div class="form-group mb-4"><label class="form-label">Diagnóstico</label>
                        <textarea class="form-control" id="con-diagnostico" rows="2"></textarea></div>
                    <div class="form-group mb-4"><label class="form-label">Tratamiento realizado</label>
                        <textarea class="form-control" id="con-tratamiento" rows="2"></textarea></div>
                    <div class="form-group mb-4"><label class="form-label">Observaciones</label>
                        <textarea class="form-control" id="con-observaciones" rows="2"></textarea></div>
                    <div class="form-group mb-4"><label class="form-label">Próxima cita sugerida</label>
                        <input type="date" class="form-control" id="con-proxima" style="max-width:220px" /></div>

                    <h3 style="font-size:var(--fs-base);font-weight:600;margin:var(--sp-6) 0 var(--sp-3);color:var(--color-text-muted)">Dientes tratados</h3>
                    <div id="dientes-lista"></div>
                    <button type="button" class="btn btn-outline btn-sm mb-4" id="btn-add-diente">+ Agregar diente</button>

                    <h3 style="font-size:var(--fs-base);font-weight:600;margin:var(--sp-6) 0 var(--sp-3);color:var(--color-text-muted)">Receta</h3>
                    <div id="receta-lista"></div>
                    <button type="button" class="btn btn-outline btn-sm mb-4" id="btn-add-med">+ Agregar medicamento</button>

                    <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;border-top:1px solid var(--color-border);padding-top:var(--sp-4)">
                        <button type="button" class="btn btn-ghost" id="btn-cancel-con">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-con">Registrar consulta</button>
                    </div>
                </form>
            </div></div>`;

        document.getElementById('btn-volver-con').addEventListener('click', () => { window.location.hash = '#/citas/' + citaId; });
        document.getElementById('btn-cancel-con').addEventListener('click', () => { window.location.hash = '#/citas/' + citaId; });

        document.getElementById('btn-add-diente').addEventListener('click', () => {
            const d = document.createElement('div'); d.className = 'form-row mb-3';
            d.innerHTML = `<div class="form-group"><input type="number" class="form-control d-num" min="11" max="48" placeholder="Diente (FDI)"></div>
                <div class="form-group"><input type="text" class="form-control d-proc" placeholder="Procedimiento"></div>
                <div class="form-group"><input type="text" class="form-control d-prev" placeholder="Estado previo"></div>
                <div class="form-group"><input type="text" class="form-control d-post" placeholder="Estado posterior"></div>
                <button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">✕</button>`;
            document.getElementById('dientes-lista').appendChild(d);
        });

        document.getElementById('btn-add-med').addEventListener('click', () => {
            const d = document.createElement('div'); d.className = 'form-row mb-3';
            d.innerHTML = `<div class="form-group"><input type="text" class="form-control m-nombre" placeholder="Medicamento"></div>
                <div class="form-group"><input type="text" class="form-control m-dosis" placeholder="Dosis"></div>
                <div class="form-group"><input type="text" class="form-control m-freq" placeholder="Frecuencia"></div>
                <div class="form-group"><input type="text" class="form-control m-dur" placeholder="Duración"></div>
                <button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">✕</button>`;
            document.getElementById('receta-lista').appendChild(d);
        });

        document.getElementById('form-consulta').addEventListener('submit', async e => {
            e.preventDefault();
            const dientes = [...document.querySelectorAll('#dientes-lista .form-row')].map(r => {
                const n = parseInt(r.querySelector('.d-num')?.value); if (!n) return null;
                return { numeroDiente: n, procedimiento: r.querySelector('.d-proc')?.value||null, estadoPrevio: r.querySelector('.d-prev')?.value||null, estadoPosterior: r.querySelector('.d-post')?.value||null };
            }).filter(Boolean);
            const meds = [...document.querySelectorAll('#receta-lista .form-row')].map(r => {
                const nom = r.querySelector('.m-nombre')?.value?.trim(); if (!nom) return null;
                return { medicamento: nom, dosis: r.querySelector('.m-dosis')?.value||null, frecuencia: r.querySelector('.m-freq')?.value||null, duracion: r.querySelector('.m-dur')?.value||null };
            }).filter(Boolean);

            const body = { citaId, motivoConsulta: document.getElementById('con-motivo').value.trim()||null, exploracionFisica: document.getElementById('con-exploracion').value.trim()||null, diagnostico: document.getElementById('con-diagnostico').value.trim()||null, tratamiento: document.getElementById('con-tratamiento').value.trim()||null, observaciones: document.getElementById('con-observaciones').value.trim()||null, proximaCita: document.getElementById('con-proxima').value||null, dientesTratados: dientes, receta: meds.length ? { indicaciones: null, detalle: meds } : null };
            const btn = document.getElementById('btn-save-con'); btn.disabled = true; btn.textContent = 'Guardando…';
            UI.showLoader();
            const res = await Api.post('/api/consultas', body);
            UI.hideLoader(); btn.disabled = false; btn.textContent = 'Registrar consulta';
            if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
            UI.toast('Consulta registrada correctamente', 'success');
            window.location.hash = '#/citas/' + citaId;
        });
    },

    async _renderDetalle(container, id) {
        UI.showLoader(); const res = await Api.get('/api/consultas/' + id); UI.hideLoader();
        if (!res.ok) { container.innerHTML = `<div class="card"><div class="card-body text-danger">${res.mensaje}</div></div>`; return; }
        const c = res.datos;
        const fila = (l,v) => `<div style="display:flex;gap:var(--sp-3);padding:var(--sp-2) 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm)"><span class="text-muted" style="min-width:130px">${l}</span><span>${v??'—'}</span></div>`;
        container.innerHTML = `
            <div class="page-header"><h1 class="page-title">Consulta #${c.id}</h1>
                <button class="btn btn-ghost" onclick="history.back()">← Volver</button></div>
            <div class="card"><div class="card-body">
                ${fila('Fecha',UI.fechaHora(c.fechaConsulta))} ${fila('Doctor',c.doctor)}
                ${fila('Motivo',c.motivoConsulta)} ${fila('Exploración',c.exploracionFisica)}
                ${fila('Diagnóstico',c.diagnostico)} ${fila('Tratamiento',c.tratamiento)}
                ${fila('Observaciones',c.observaciones)}
            </div></div>`;
    },
    destroy() {}
};
export default ConsultasModule;
