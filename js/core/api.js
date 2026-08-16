// ============================================================
// API.JS — Wrapper centralizado para todas las llamadas a la API
// Agrega el token JWT automáticamente, maneja errores globales
// y devuelve siempre { ok, datos, mensaje } para que los módulos
// no tengan que parsear la respuesta de la API.
// ============================================================

import State from './state.js';

const BASE_URL = 'https://localhost:7080';
//const BASE_URL = 'https://clinicadentalapi20260807141159-eyepevgxhgb5fhhs.centralus-01.azurewebsites.net';

async function request(method, path, body = null) {
    const token = State.getToken();

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`${BASE_URL}${path}`, options);
    } catch (networkError) {
        return {
            ok: false,
            datos: null,
            mensaje: 'No se pudo conectar con el servidor. Verifica que la API esté corriendo.'
        };
    }

    // Token expirado o no autorizado
    if (response.status === 401) {
        // Si estamos en el login, es credenciales incorrectas, no sesión expirada.
        // Dejar que el módulo de login muestre el mensaje de la API.
        const enLogin = window.location.hash === '#/login' || window.location.hash === ''
            || path === '/api/auth/login';

        if (!enLogin) {
            State.clear();
            window.location.hash = '#/login';
            return { ok: false, datos: null, mensaje: 'Sesión expirada. Inicia sesión nuevamente.' };
        }
        // En login: pasar el error al módulo para que lo muestre
    }

    // Sin permiso
    if (response.status === 403) {
        return { ok: false, datos: null, mensaje: 'No tienes permiso para realizar esta acción.' };
    }

    let json;
    try {
        json = await response.json();
    } catch {
        return { ok: false, datos: null, mensaje: 'Respuesta inesperada del servidor.' };
    }

    // La API siempre devuelve { exito, mensaje, datos }
    return {
        ok: json.exito === true,
        datos: json.datos ?? null,
        mensaje: json.mensaje ?? (response.ok ? 'OK' : 'Error desconocido')
    };
}

const Api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),

    // Helpers de URL con query params
    buildUrl(path, params = {}) {
        const filtered = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '');
        if (filtered.length === 0) return path;
        const qs = new URLSearchParams(filtered).toString();
        return `${path}?${qs}`;
    }
};

export default Api;
