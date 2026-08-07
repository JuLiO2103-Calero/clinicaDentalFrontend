// cambiar-password/index.js — El usuario cambia su propia contraseña

import Api   from '../../core/api.js';
import State from '../../core/state.js';
import Auth  from '../../core/auth.js';
import UI    from '../../utils/ui.js';

const CambiarPasswordModule = {
    render(container) {
        const debeObligatorio = State.getUsuario()?.debeCambiarPassword;

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Cambiar contraseña</h1>
            </div>
            ${debeObligatorio ? `
            <div style="background:#fff3cd;color:#664d03;padding:var(--sp-3) var(--sp-4);border-radius:var(--radius);margin-bottom:var(--sp-4);font-size:var(--fs-sm)">
                ⚠️ Estás usando una contraseña temporal. Debes crear una nueva para continuar.
            </div>` : ''}
            <div class="card" style="max-width:440px">
                <div class="card-body">
                    <form id="form-cambiar-pw" novalidate>
                        <div class="form-group mb-4">
                            <label class="form-label">Contraseña actual <span class="required">*</span></label>
                            <input type="password" class="form-control" id="pw-actual" autocomplete="current-password" />
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Nueva contraseña <span class="required">*</span></label>
                            <input type="password" class="form-control" id="pw-nueva" autocomplete="new-password" />
                            <span class="form-hint">Mínimo 8 caracteres</span>
                        </div>
                        <div class="form-group mb-4">
                            <label class="form-label">Confirmar nueva contraseña <span class="required">*</span></label>
                            <input type="password" class="form-control" id="pw-confirmar" autocomplete="new-password" />
                        </div>
                        <button type="submit" class="btn btn-primary w-full" id="btn-cambiar-pw">Cambiar contraseña</button>
                    </form>
                </div>
            </div>`;

        document.getElementById('form-cambiar-pw').addEventListener('submit', async e => {
            e.preventDefault();
            const actual    = document.getElementById('pw-actual').value;
            const nueva     = document.getElementById('pw-nueva').value;
            const confirmar = document.getElementById('pw-confirmar').value;

            if (!actual || !nueva) { UI.toast('Completa todos los campos', 'warning'); return; }
            if (nueva.length < 8)  { UI.toast('La nueva contraseña debe tener al menos 8 caracteres', 'warning'); return; }
            if (nueva !== confirmar) { UI.toast('Las contraseñas no coinciden', 'warning'); return; }

            const btn = document.getElementById('btn-cambiar-pw');
            btn.disabled = true; btn.textContent = 'Guardando…';
            UI.showLoader();
            const res = await Api.put('/api/cuenta/password', { passwordActual: actual, passwordNueva: nueva });
            UI.hideLoader();
            btn.disabled = false; btn.textContent = 'Cambiar contraseña';

            if (!res.ok) { UI.toast(res.mensaje, 'error'); return; }

            // Actualizar el flag local
            const u = State.getUsuario();
            if (u) { u.debeCambiarPassword = false; State.setUsuario(u); }

            UI.toast('Contraseña actualizada correctamente', 'success');
            window.location.hash = '#/dashboard';
        });
    },
    destroy() {}
};

export default CambiarPasswordModule;
