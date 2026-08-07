// ============================================================
// STATE.JS — Estado global de la aplicación
// Un objeto central que todos los módulos leen y escriben
// a través de getters y setters controlados.
// ============================================================

const State = (() => {
    // Estado privado
    let _state = {
        token:    null,
        usuario:  null,   // { id, nombre, apellido, nombreCompleto, email, rol, sucursalId }
        expiraEn: null,
    };

    return {
        // ---------- TOKEN ----------
        getToken() {
            return _state.token || localStorage.getItem('cd_token');
        },

        setToken(token, expiraEn) {
            _state.token    = token;
            _state.expiraEn = expiraEn;
            localStorage.setItem('cd_token', token);
            localStorage.setItem('cd_expira', expiraEn);
        },

        // ---------- USUARIO ----------
        getUsuario() {
            if (_state.usuario) return _state.usuario;
            const raw = localStorage.getItem('cd_usuario');
            return raw ? JSON.parse(raw) : null;
        },

        setUsuario(usuario) {
            _state.usuario = usuario;
            localStorage.setItem('cd_usuario', JSON.stringify(usuario));
        },

        getRol() {
            return this.getUsuario()?.rol ?? null;
        },

        getSucursalId() {
            return this.getUsuario()?.sucursalId ?? null;
        },

        // ---------- AUTENTICACIÓN ----------
        isAuthenticated() {
            const token    = this.getToken();
            const expiraEn = _state.expiraEn || localStorage.getItem('cd_expira');
            if (!token || !expiraEn) return false;
            return new Date(expiraEn) > new Date();
        },

        // ---------- LIMPIEZA ----------
        clear() {
            _state = { token: null, usuario: null, expiraEn: null };
            localStorage.removeItem('cd_token');
            localStorage.removeItem('cd_expira');
            localStorage.removeItem('cd_usuario');
        }
    };
})();

export default State;
