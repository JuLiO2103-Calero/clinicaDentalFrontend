// ============================================================
// AUTH.JS — Login, logout, guard de rutas
// ============================================================

import Api from './api.js';
import State from './state.js';

const Auth = {
    async login(nombreUsuario, password) {
        const result = await Api.post('/api/auth/login', { nombreUsuario, password });
        if (!result.ok) return result;

        const { token, expiraEn, usuario } = result.datos;
        State.setToken(token, expiraEn);
        State.setUsuario(usuario);

        return { ok: true, usuario, datos: usuario, mensaje: result.mensaje };
    },

    logout() {
        State.clear();
        window.location.hash = '#/login';
    },

    isAuthenticated() {
        return State.isAuthenticated();
    },

    // Verifica que el rol actual esté entre los permitidos
    hasRole(...roles) {
        return roles.includes(State.getRol());
    },

    // Guard para rutas protegidas: redirige al login si no hay sesión
    guard() {
        if (!this.isAuthenticated()) {
            window.location.hash = '#/login';
            return false;
        }
        return true;
    }
};

export default Auth;
