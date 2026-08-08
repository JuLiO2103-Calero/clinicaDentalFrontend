// ============================================================
// LOGIN.JS — Inicio de sesión por nombre de usuario
// ============================================================

import Auth from '../core/auth.js';
import Api from '../core/api.js';
import UI from '../utils/ui.js';

const LoginModule = {
    render(container) {
        container.innerHTML = `
            <div class="login-page">
                <div class="card" style="width:100%;max-width:400px">
                    <div class="card-body" style="padding:2.5rem">
                        <div class="text-center mb-4">
                            <h1 style="font-size:1.5rem;font-weight:700;letter-spacing:-.02em">
                                Clínica <span style="color:var(--color-primary)">Dental</span>
                            </h1>
                            <p class="text-muted text-sm mt-2">Sistema de gestión multi-sucursal</p>
                        </div>

                        <form id="form-login" novalidate>
                            <div class="form-group mb-4">
                                <label class="form-label" for="login-usuario">
                                    Nombre de usuario <span class="required">*</span>
                                </label>
                                <input type="text" id="login-usuario" class="form-control"
                                    placeholder="Tu usuario" autocomplete="username" autofocus />
                                <span class="form-error" id="login-usuario-error"></span>
                            </div>

                            <div class="form-group mb-4">
                                <label class="form-label" for="login-password">
                                    Contraseña <span class="required">*</span>
                                </label>
                                <div style="position:relative">
                                    <input type="password" id="login-password" class="form-control"
                                        placeholder="••••••••" autocomplete="current-password" />
                                    <button type="button" id="btn-toggle-pw" class="btn btn-ghost btn-sm"
                                        style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:2px 6px"
                                        title="Mostrar / ocultar">👁</button>
                                </div>
                                <span class="form-error" id="login-password-error"></span>
                            </div>

                            <div id="login-error-banner" class="hidden" style="background:#f8d7da;border:1px solid #f5c2c7;color:#58151c;border-radius:var(--radius);padding:var(--sp-3) var(--sp-4);font-size:var(--fs-sm);margin-bottom:var(--sp-4)"></div>

                            <button type="submit" class="btn btn-primary w-full btn-lg" id="btn-login">Iniciar sesión</button>

                            <div class="text-center mt-4">
                                <a href="#" id="link-recuperar" style="color:var(--color-primary);font-size:var(--fs-sm)">¿Olvidaste tu contraseña?</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal recuperación por preguntas de seguridad -->
            <div id="modal-recuperar" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Recuperar contraseña</h3>
                        <button class="modal-close" id="btn-close-rec">×</button>
                    </div>
                    <div class="modal-body">
                        <!-- Paso 1: usuario -->
                        <div id="rec-paso1">
                            <p class="text-sm text-muted mb-4">Ingresa tu nombre de usuario para mostrar tus preguntas de seguridad.</p>
                            <div class="form-group">
                                <label class="form-label">Nombre de usuario</label>
                                <input type="text" class="form-control" id="rec-usuario" placeholder="jcastillo" />
                            </div>
                        </div>
                        <!-- Paso 2: preguntas + nueva contraseña -->
                        <div id="rec-paso2" class="hidden">
                            <p class="text-sm text-muted mb-3">Responde tus preguntas de seguridad y define una nueva contraseña.</p>
                            <div id="rec-preguntas"></div>
                            <div class="form-group mb-2">
                                <label class="form-label">Nueva contraseña</label>
                                <input type="password" class="form-control" id="rec-password" autocomplete="new-password" />
                                <span class="form-hint">Mín. 8 caracteres, con mayúscula, minúscula y número</span>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirmar contraseña</label>
                                <input type="password" class="form-control" id="rec-password2" autocomplete="new-password" />
                            </div>
                        </div>
                        <div id="rec-resultado" class="mt-4"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" id="btn-cancel-rec">Cerrar</button>
                        <button class="btn btn-primary" id="btn-rec-continuar">Continuar</button>
                        <button class="btn btn-primary hidden" id="btn-rec-guardar">Restablecer</button>
                    </div>
                </div>
            </div>`;

        this._bindEvents();
    },

    _bindEvents() {
        const form = document.getElementById('form-login');
        const btnPw = document.getElementById('btn-toggle-pw');
        const pwInput = document.getElementById('login-password');

        btnPw.addEventListener('click', () => {
            const esPw = pwInput.type === 'password';
            pwInput.type = esPw ? 'text' : 'password';
            btnPw.textContent = esPw ? '🙈' : '👁';
        });

        document.getElementById('login-usuario').addEventListener('input', () => {
            UI.clearFieldError('login-usuario'); this._hideBanner();
        });
        pwInput.addEventListener('input', () => {
            UI.clearFieldError('login-password'); this._hideBanner();
        });

        form.addEventListener('submit', async e => { e.preventDefault(); await this._handleSubmit(); });

        // Recuperación por preguntas de seguridad
        document.getElementById('link-recuperar').addEventListener('click', e => {
            e.preventDefault();
            this._resetModalRecuperar();
            document.getElementById('rec-usuario').value = document.getElementById('login-usuario').value.trim();
            UI.openModal('modal-recuperar');
        });
        document.getElementById('btn-close-rec').addEventListener('click', () => UI.closeModal('modal-recuperar'));
        document.getElementById('btn-cancel-rec').addEventListener('click', () => UI.closeModal('modal-recuperar'));
        document.getElementById('btn-rec-continuar').addEventListener('click', () => this._recIniciar());
        document.getElementById('btn-rec-guardar').addEventListener('click', () => this._recValidar());
    },

    _resetModalRecuperar() {
        document.getElementById('rec-paso1').classList.remove('hidden');
        document.getElementById('rec-paso2').classList.add('hidden');
        document.getElementById('btn-rec-continuar').classList.remove('hidden');
        document.getElementById('btn-rec-guardar').classList.add('hidden');
        document.getElementById('rec-resultado').innerHTML = '';
        document.getElementById('rec-preguntas').innerHTML = '';
        ['rec-password', 'rec-password2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        this._preguntasRec = [];
    },

    async _handleSubmit() {
        const usuario = document.getElementById('login-usuario').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-login');
        this._hideBanner();

        let valid = true;
        if (!usuario) { UI.setFieldError('login-usuario', 'El nombre de usuario es obligatorio.'); valid = false; }
        if (!password) { UI.setFieldError('login-password', 'La contraseña es obligatoria.'); valid = false; }
        if (!valid) return;

        btn.disabled = true; btn.textContent = 'Iniciando sesión…';
        const result = await Auth.login(usuario, password);
        btn.disabled = false; btn.textContent = 'Iniciar sesión';

        if (!result.ok) { this._showBanner(result.mensaje); return; }

        // Si el usuario tiene contraseña temporal, forzar cambio
        if (result.usuario?.debeCambiarPassword) {
            window.location.hash = '#/cambiar-password';
            return;
        }
        window.location.hash = '#/dashboard';
    },

    async _recIniciar() {
        const usuario = document.getElementById('rec-usuario').value.trim();
        if (!usuario) { UI.toast('Ingresa tu nombre de usuario', 'warning'); return; }

        const btn = document.getElementById('btn-rec-continuar');
        btn.disabled = true; btn.textContent = 'Buscando…';
        const res = await Api.post('/api/cuenta/recuperar/iniciar', { nombreUsuario: usuario });
        btn.disabled = false; btn.textContent = 'Continuar';

        const cont = document.getElementById('rec-resultado');
        if (!res.ok) { cont.innerHTML = `<div class="text-sm text-danger">${res.mensaje}</div>`; return; }

        if (!res.datos?.tienePreguntas) {
            cont.innerHTML = `<div style="background:#fff3cd;color:#664d03;padding:var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
                Este usuario no tiene preguntas de seguridad configuradas. Contacta al administrador para recuperar tu acceso.</div>`;
            return;
        }

        // Mostrar preguntas
        this._preguntasRec = res.datos.preguntas;
        document.getElementById('rec-preguntas').innerHTML = this._preguntasRec.map((p, i) => `
            <div class="form-group mb-3">
                <label class="form-label">${p.texto}</label>
                <input type="text" class="form-control rec-resp" data-pregunta="${p.id}" autocomplete="off" />
            </div>`).join('');

        cont.innerHTML = '';
        document.getElementById('rec-paso1').classList.add('hidden');
        document.getElementById('rec-paso2').classList.remove('hidden');
        document.getElementById('btn-rec-continuar').classList.add('hidden');
        document.getElementById('btn-rec-guardar').classList.remove('hidden');
    },

    async _recValidar() {
        const usuario = document.getElementById('rec-usuario').value.trim();
        const pass = document.getElementById('rec-password').value;
        const pass2 = document.getElementById('rec-password2').value;

        const respuestas = Array.from(document.querySelectorAll('.rec-resp')).map(el => ({
            preguntaId: parseInt(el.dataset.pregunta),
            respuesta: el.value.trim()
        }));

        if (respuestas.some(r => !r.respuesta)) { UI.toast('Responde todas las preguntas', 'warning'); return; }
        if (pass.length < 8) { UI.toast('La contraseña debe tener al menos 8 caracteres', 'warning'); return; }
        if (pass !== pass2) { UI.toast('Las contraseñas no coinciden', 'warning'); return; }

        const btn = document.getElementById('btn-rec-guardar');
        btn.disabled = true; btn.textContent = 'Validando…';
        const res = await Api.post('/api/cuenta/recuperar/validar', {
            nombreUsuario: usuario, respuestas, passwordNueva: pass
        });
        btn.disabled = false; btn.textContent = 'Restablecer';

        const cont = document.getElementById('rec-resultado');
        if (!res.ok) { cont.innerHTML = `<div class="text-sm text-danger">${res.mensaje}</div>`; return; }

        cont.innerHTML = `<div style="background:#d1e7dd;color:#0a3622;padding:var(--sp-3);border-radius:var(--radius);font-size:var(--fs-sm)">
            ✅ ${res.mensaje}</div>`;
        setTimeout(() => {
            UI.closeModal('modal-recuperar');
            document.getElementById('login-usuario').value = usuario;
            document.getElementById('login-password').focus();
        }, 1800);
    },

    _showBanner(m) { const b = document.getElementById('login-error-banner'); b.textContent = m; b.classList.remove('hidden'); },
    _hideBanner() { document.getElementById('login-error-banner')?.classList.add('hidden'); },
    destroy() { }
};

export default LoginModule;
