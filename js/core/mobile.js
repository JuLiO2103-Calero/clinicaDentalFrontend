// ============================================================
// core/mobile.js — Comportamiento responsive (móvil/tablet)
// Responsabilidad única:
//   1. Menú hamburguesa (abrir/cerrar el sidebar en móvil).
//   2. Convertir tablas en tarjetas apiladas (data-label).
// No contiene lógica de negocio ni de otros módulos.
// ============================================================

const Mobile = {
    _observer: null,
    _iniciado: false,

    /// Inicializa el comportamiento móvil. Llamar una vez tras el login,
    /// cuando el app-shell ya está en el DOM. Es idempotente: llamarlo
    /// varias veces no duplica listeners.
    init() {
        if (this._iniciado) { this._adaptarTablas(); return; }
        const hamburger = document.getElementById('btn-hamburger');
        if (!hamburger) return;   // el shell aún no está montado
        this._initMenu();
        this._initTablas();
        this._iniciado = true;
    },

    // ---------- Menú hamburguesa ----------
    _initMenu() {
        const sidebar   = document.getElementById('sidebar');
        const backdrop  = document.getElementById('sidebar-backdrop');
        const hamburger = document.getElementById('btn-hamburger');
        if (!sidebar || !hamburger) return;

        const abrir  = () => { sidebar.classList.add('sidebar-open'); backdrop?.classList.add('show'); };
        const cerrar = () => { sidebar.classList.remove('sidebar-open'); backdrop?.classList.remove('show'); };

        hamburger.addEventListener('click', () => {
            sidebar.classList.contains('sidebar-open') ? cerrar() : abrir();
        });
        backdrop?.addEventListener('click', cerrar);

        // Al elegir una opción del menú, cerrarlo
        sidebar.querySelectorAll('.sidebar-item[data-route]').forEach(btn => {
            btn.addEventListener('click', cerrar);
        });

        this._cerrarMenu = cerrar;
    },

    // ---------- Tablas → tarjetas ----------
    _initTablas() {
        // Adaptar las tablas presentes ahora
        this._adaptarTablas();

        // Y las que aparezcan al navegar entre vistas
        const shell = document.getElementById('app-shell');
        if (shell && 'MutationObserver' in window) {
            this._observer = new MutationObserver(() => this._adaptarTablas());
            this._observer.observe(shell, { childList: true, subtree: true });
        }
    },

    /// Recorre las tablas y pone en cada celda el nombre de su columna,
    /// para que responsive.css las muestre como tarjetas en móvil.
    _adaptarTablas() {
        document.querySelectorAll('table.table').forEach(tabla => {
            tabla.classList.add('table-responsive-cards');

            const encabezados = [...tabla.querySelectorAll('thead th')]
                .map(th => th.textContent.trim());
            if (!encabezados.length) return;

            tabla.querySelectorAll('tbody tr').forEach(tr => {
                [...tr.children].forEach((td, i) => {
                    if (!td.hasAttribute('data-label')) {
                        td.setAttribute('data-label', encabezados[i] ?? '');
                    }
                });
            });
        });
    },

    /// Cierra el menú (por si otro módulo lo necesita)
    cerrarMenu() { this._cerrarMenu?.(); },

    /// Limpieza (si alguna vez se desmonta el shell)
    destroy() {
        if (this._observer) { this._observer.disconnect(); this._observer = null; }
    }
};

export default Mobile;
