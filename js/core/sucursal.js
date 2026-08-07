// ============================================================
// SUCURSAL.JS — Manejo centralizado de la sucursal activa
//
// Reglas:
//   - Admin: puede seleccionar cualquier sucursal o "Todas".
//     El selector aparece en el navbar.
//   - Doctor / Asistente: siempre ven solo su sucursal asignada.
//     No ven el selector.
//
// Todos los módulos llaman getSucursalFiltro() para saber
// qué sucursal_id enviar a la API (null = todas).
// ============================================================

import Api   from './api.js';
import State from './state.js';

let _sucursales = null; // cache

const Sucursal = {
    /// Devuelve el sucursalId que se debe enviar a la API como filtro.
    /// null = todas las sucursales (solo admin cuando elige "Todas").
    getSucursalFiltro() {
        const usuario = State.getUsuario();
        if (!usuario) return null;

        // Doctor y asistente: siempre su sucursal asignada
        if (usuario.rol !== 'administrador') {
            return usuario.sucursalId ?? null;
        }

        // Admin: lo que tenga seleccionado en el selector (null = todas)
        const select = document.getElementById('select-sucursal-global');
        if (!select) return null;

        const val = select.value;
        return val === '' ? null : parseInt(val);
    },

    /// Nombre de la sucursal activa (para mostrar en pantalla)
    getSucursalNombre() {
        const id = this.getSucursalFiltro();
        if (id === null) return 'Todas las sucursales';
        if (!_sucursales) return `Sucursal ${id}`;
        const s = _sucursales.find(s => s.id === id);
        return s?.nombre ?? `Sucursal ${id}`;
    },

    /// Carga las sucursales desde la API y monta el selector en el navbar.
    /// Llamar después del login exitoso.
    async inicializar() {
        const usuario = State.getUsuario();
        if (!usuario) return;

        // Cargar catálogo de sucursales
        const res = await Api.get('/api/sucursales');
        _sucursales = res.ok ? (res.datos ?? []) : [];

        const container = document.getElementById('sucursal-selector-container');
        if (!container) return;

        // Solo el admin ve el selector
        if (usuario.rol !== 'administrador') {
            // Mostrar solo el nombre de su sucursal
            const nombre = _sucursales.find(s => s.id === usuario.sucursalId)?.nombre ?? '';
            container.innerHTML = nombre
                ? `<span class="text-xs text-muted" style="padding:0 var(--sp-2)">📍 ${nombre}</span>`
                : '';
            return;
        }

        // Admin: selector con opción "Todas"
        const opciones = _sucursales.map(s =>
            `<option value="${s.id}">${s.nombre}</option>`).join('');

        container.innerHTML = `
            <select id="select-sucursal-global" class="form-control"
                style="width:auto;padding:var(--sp-1) var(--sp-3);font-size:var(--fs-xs);
                       border-color:var(--color-border);height:32px">
                <option value="">Todas las sucursales</option>
                ${opciones}
            </select>`;

        // Al cambiar la sucursal, notificar a los módulos activos
        document.getElementById('select-sucursal-global').addEventListener('change', () => {
            window.dispatchEvent(new CustomEvent('sucursal-changed'));
        });
    },

    /// Lista de sucursales cargadas (para usar en formularios)
    getSucursales() {
        return _sucursales ?? [];
    }
};

export default Sucursal;
