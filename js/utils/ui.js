// ============================================================
// UI.JS — Utilidades de interfaz: toast, loader, modal, formato
// ============================================================

const UI = {
    // ---------- TOAST ----------
    toast(mensaje, tipo = 'info', duracion = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const iconos = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        const el = document.createElement('div');
        el.className = `toast toast-${tipo}`;
        el.innerHTML = `<span>${iconos[tipo] ?? 'ℹ'}</span><span>${mensaje}</span>`;
        container.appendChild(el);

        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 300ms';
            setTimeout(() => el.remove(), 300);
        }, duracion);
    },

    // ---------- LOADER ----------
    showLoader() {
        const el = document.getElementById('loader');
        if (el) el.classList.remove('hidden');
    },

    hideLoader() {
        const el = document.getElementById('loader');
        if (el) el.classList.add('hidden');
    },

    // ---------- MODAL ----------
    openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    },

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    },

    // Crea y muestra un modal genérico de confirmación
    confirm(mensaje, onConfirm, titulo = 'Confirmar acción') {
        const id = 'modal-confirm';
        document.getElementById(id)?.remove();

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${titulo}</h3>
                    <button class="modal-close" onclick="document.getElementById('${id}').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>${mensaje}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="document.getElementById('${id}').remove()">Cancelar</button>
                    <button class="btn btn-danger" id="btn-confirm-ok">Confirmar</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        document.getElementById('btn-confirm-ok').addEventListener('click', () => {
            modal.remove();
            onConfirm();
        });

        // Cerrar al hacer clic en el overlay
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    },

    // ---------- FORMATEO ----------
    // Nicaragua: UTC-6 fijo (America/Managua), sin horario de verano.
    _tz: 'America/Managua',

    fecha(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleDateString('es-NI', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            timeZone: this._tz
        });
    },

    fechaHora(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleString('es-NI', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            timeZone: this._tz
        });
    },

    moneda(valor) {
        if (valor == null) return '—';
        return new Intl.NumberFormat('es-NI', {
            style: 'currency', currency: 'NIO', minimumFractionDigits: 2
        }).format(valor);
    },

    badge(estado) {
        const clase = `badge badge-${estado?.replace(' ', '_') ?? 'inactivo'}`;
        const texto = estado ?? '—';
        return `<span class="${clase}">${texto}</span>`;
    },

    // ---------- FORMULARIOS ----------
    formData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        const data = {};
        new FormData(form).forEach((value, key) => {
            // Convertir campos vacíos a null, números a número
            if (value === '') {
                data[key] = null;
            } else if (!isNaN(value) && value !== '') {
                data[key] = Number(value);
            } else {
                data[key] = value;
            }
        });
        return data;
    },

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
        // Limpiar errores
        form?.querySelectorAll('.form-control.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        form?.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    },

    setFieldError(fieldId, mensaje) {
        const field = document.getElementById(fieldId);
        if (field) field.classList.add('is-invalid');
        const error = document.getElementById(`${fieldId}-error`);
        if (error) error.textContent = mensaje;
    },

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) field.classList.remove('is-invalid');
        const error = document.getElementById(`${fieldId}-error`);
        if (error) error.textContent = '';
    },

    // ---------- TABLA VACÍA ----------
    emptyRow(cols, mensaje = 'Sin resultados') {
        return `<tr><td colspan="${cols}" class="text-center text-muted" style="padding:2rem">${mensaje}</td></tr>`;
    }
};

// Exponer globalmente para uso en onclick inline del HTML
window.UI = UI;

export default UI;
