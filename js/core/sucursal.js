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
        // Todos los usuarios (incluido el admin) operan sobre SU sucursal
        // asignada. El selector global fue eliminado; el filtrado
        // multi-sucursal vive ahora solo en el módulo de Reportes y en
        // el filtro propio de cada componente (dashboard, calendario).
        return usuario.sucursalId ?? null;
    },

    /// Nombre de la sucursal activa (para mostrar en pantalla)
    getSucursalNombre() {
        const id = this.getSucursalFiltro();
        if (id === null) return 'Todas las sucursales';
        if (!_sucursales) return `Sucursal ${id}`;
        const s = _sucursales.find(s => s.id === id);
        return s?.nombre ?? `Sucursal ${id}`;
    },

    /// Carga las sucursales desde la API y muestra la sucursal del
    /// usuario como texto estático en el navbar (sin selector).
    /// Llamar después del login exitoso.
    async inicializar() {
        const usuario = State.getUsuario();
        if (!usuario) return;

        // Cargar catálogo de sucursales (se usa en formularios)
        const res = await Api.get('/api/sucursales');
        _sucursales = res.ok ? (res.datos ?? []) : [];

        const container = document.getElementById('sucursal-selector-container');
        if (!container) return;

        // Todos los usuarios (incluido el admin) ven su sucursal asignada
        // como texto fijo. Ya no hay selector global "Todas las sucursales".
        const nombre = _sucursales.find(s => s.id === usuario.sucursalId)?.nombre ?? '';
        container.innerHTML = nombre
            ? `<span class="text-sm" style="padding:0 var(--sp-2);color:var(--color-text);font-weight:500">📍 ${nombre}</span>`
            : '';
    },

    /// Lista de sucursales cargadas (para usar en formularios)
    getSucursales() {
        return _sucursales ?? [];
    }
};

export default Sucursal;
