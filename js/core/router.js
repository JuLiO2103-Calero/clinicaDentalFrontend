// ============================================================
// ROUTER.JS — SPA router hash-based
// Importa los módulos desde sus carpetas (index.js)
// ============================================================

import Auth from './auth.js';

import LoginModule      from '../modules/login.js';
import DashboardModule  from '../modules/dashboard/index.js';
import PacientesModule  from '../modules/pacientes/index.js';
import CitasModule      from '../modules/citas/index.js';
import ConsultasModule  from '../modules/consultas/index.js';
import PagosModule      from '../modules/pagos/index.js';
import CajaModule       from '../modules/caja/index.js';
import UsuariosModule   from '../modules/usuarios/index.js';
import ReportesModule   from '../modules/reportes/index.js';
import AuditoriaModule  from '../modules/auditoria/index.js';
import ServiciosModule  from '../modules/servicios/index.js';
import CambiarPasswordModule from '../modules/cambiar-password/index.js';
import PreguntasSeguridadModule from '../modules/preguntas-seguridad/index.js';

const ROUTES = [
    { prefix: '#/login',     module: LoginModule,     public: true },
    { prefix: '#/dashboard', module: DashboardModule,  roles: null },
    { prefix: '#/pacientes', module: PacientesModule,  roles: null },
    { prefix: '#/citas',     module: CitasModule,      roles: null },
    { prefix: '#/consultas', module: ConsultasModule,  roles: null },
    { prefix: '#/pagos',     module: PagosModule,      roles: null },
    { prefix: '#/caja',      module: CajaModule,       roles: null },
    { prefix: '#/reportes',  module: ReportesModule,   roles: null },
    { prefix: '#/usuarios',  module: UsuariosModule,   roles: ['administrador'] },
    { prefix: '#/auditoria', module: AuditoriaModule,  roles: ['administrador'] },
    { prefix: '#/servicios', module: ServiciosModule,  roles: ['administrador'] },
    { prefix: '#/cambiar-password', module: CambiarPasswordModule, roles: null },
    { prefix: '#/preguntas-seguridad', module: PreguntasSeguridadModule, roles: null },
];

const Router = {
    currentModule: null,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    navigate() {
        const hash = window.location.hash || '#/login';
        const route = ROUTES.find(r => hash === r.prefix || hash.startsWith(r.prefix + '/'));

        if (!route) {
            window.location.hash = Auth.isAuthenticated() ? '#/dashboard' : '#/login';
            return;
        }

        if (route.public && Auth.isAuthenticated()) {
            window.location.hash = '#/dashboard';
            return;
        }

        if (!route.public && !Auth.isAuthenticated()) {
            window.location.hash = '#/login';
            return;
        }

        if (route.roles && !Auth.hasRole(...route.roles)) {
            import('../utils/ui.js').then(({ default: UI }) => {
                UI.toast('No tienes permiso para acceder a esta sección.', 'error');
            });
            window.location.hash = '#/dashboard';
            return;
        }

        this.mount(route.module, hash);
        this.updateSidebar(hash);
    },

    mount(module, hash) {
        if (this.currentModule?.destroy) this.currentModule.destroy();
        this.currentModule = module;

        const container = Auth.isAuthenticated()
            ? document.querySelector('#app-shell #view')
            : document.querySelector('#public-view #view');

        if (container) module.render(container, hash);
    },

    updateSidebar(hash) {
        document.querySelectorAll('.sidebar-item[data-route]').forEach(item => {
            item.classList.toggle('active', hash.startsWith(item.dataset.route));
        });
    }
};

export default Router;
