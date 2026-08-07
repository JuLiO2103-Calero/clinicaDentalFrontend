// caja/modal-tasa.js — Modal para configurar tasa de cambio (solo admin)

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';
import { getTasa } from './catalogo.js';

export function crearModalTasaHTML() {
    const t = getTasa();
    return `
        <div id="modal-tasa" class="modal-overlay hidden">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Configurar tasa de cambio</h3>
                    <button class="modal-close" id="btn-close-tasa">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-row mb-4">
                        <div class="form-group"><label class="form-label">Tasa de compra (C$ por $1)</label>
                            <input type="number" class="form-control" id="tasa-compra" value="${t?.tasaCompra ?? 36.50}" step="0.01" min="0.01" />
                            <span class="form-hint">Cliente paga en dólares</span></div>
                        <div class="form-group"><label class="form-label">Tasa de venta (C$ por $1)</label>
                            <input type="number" class="form-control" id="tasa-venta" value="${t?.tasaVenta ?? 36.80}" step="0.01" min="0.01" />
                            <span class="form-hint">Dar cambio en dólares</span></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" id="btn-cancel-tasa">Cancelar</button>
                    <button class="btn btn-primary" id="btn-save-tasa">Guardar tasa</button>
                </div>
            </div>
        </div>`;
}

export function bindModalTasa(onGuardado) {
    document.getElementById('btn-close-tasa')?.addEventListener('click', () => UI.closeModal('modal-tasa'));
    document.getElementById('btn-cancel-tasa')?.addEventListener('click', () => UI.closeModal('modal-tasa'));
    document.getElementById('btn-config-tasa')?.addEventListener('click', () => UI.openModal('modal-tasa'));

    document.getElementById('btn-save-tasa')?.addEventListener('click', async () => {
        const compra = parseFloat(document.getElementById('tasa-compra').value);
        const venta  = parseFloat(document.getElementById('tasa-venta').value);
        UI.showLoader();
        const res = await Api.post('/api/tasas-cambio', { tasaCompra: compra, tasaVenta: venta });
        UI.hideLoader();
        if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }
        UI.toast(res.mensaje, 'success');
        UI.closeModal('modal-tasa');
        onGuardado();
    });
}
