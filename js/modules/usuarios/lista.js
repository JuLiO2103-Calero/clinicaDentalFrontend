// usuarios/lista.js — Tabla de usuarios con acciones

import Api from '../../core/api.js';
import UI  from '../../utils/ui.js';

export async function cargarLista(onEditar, onEstado, onDesbloquear, onReiniciarPassword) {
    UI.showLoader();
    const res = await Api.get('/api/usuarios');
    UI.hideLoader();

    const container = document.getElementById('usuarios-tabla');
    const usuarios = res.ok ? res.datos : [];

    if (!usuarios.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin usuarios registrados</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper" style="border:none"><table class="table"><thead><tr>
            <th>Usuario</th><th>Nombre</th><th>Rol</th><th>Sucursal</th>
            <th>Estado</th><th>Último acceso</th><th>Acciones</th>
        </tr></thead><tbody>${usuarios.map(u => `
            <tr style="${!u.activo ? 'opacity:0.5' : ''}">
                <td class="font-semibold">${u.nombreUsuario}</td>
                <td class="text-sm">${u.nombreCompleto}</td>
                <td>${badgeRol(u.rol)}</td>
                <td>${u.sucursal ?? '<span class="text-muted">Todas</span>'}</td>
                <td>${estadoBadge(u)}</td>
                <td class="text-sm text-muted">${u.ultimoLogin ? UI.fechaHora(u.ultimoLogin) : 'Nunca'}</td>
                <td>
                    <div style="display:flex;gap:2px">
                        <button class="btn btn-ghost btn-sm btn-edit-u" data-id="${u.id}" title="Editar">✏️</button>
                        ${u.bloqueado ? `<button class="btn btn-ghost btn-sm btn-unlock-u" data-id="${u.id}" title="Desbloquear">🔓</button>` : ''}
                        ${u.bloqueado && !u.tienePreguntasSeguridad ? `<button class="btn btn-ghost btn-sm btn-reset-pass-u" data-id="${u.id}" data-nombre="${u.nombreUsuario}" title="Reiniciar contraseña (no configuró preguntas de seguridad)">🔑</button>` : ''}
                        <button class="btn btn-ghost btn-sm btn-estado-u" data-id="${u.id}" data-activo="${u.activo}" title="${u.activo ? 'Desactivar' : 'Activar'}">${u.activo ? '🚫' : '✅'}</button>
                    </div>
                </td>
            </tr>`).join('')}</tbody></table></div>`;

    container.querySelectorAll('.btn-edit-u').forEach(b => b.addEventListener('click', () => onEditar(parseInt(b.dataset.id))));
    container.querySelectorAll('.btn-unlock-u').forEach(b => b.addEventListener('click', () => onDesbloquear(parseInt(b.dataset.id))));
    container.querySelectorAll('.btn-reset-pass-u').forEach(b => b.addEventListener('click', () => onReiniciarPassword(parseInt(b.dataset.id), b.dataset.nombre)));
    container.querySelectorAll('.btn-estado-u').forEach(b => b.addEventListener('click', () => onEstado(parseInt(b.dataset.id), b.dataset.activo === 'true')));
}

function badgeRol(rol) {
    const colores = {
        administrador: 'background:#e0e7ff;color:#3730a3',
        doctor:        'background:#d1fae5;color:#065f46',
        asistente:     'background:#fef3c7;color:#92400e'
    };
    return `<span style="${colores[rol] ?? ''};padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600">${rol}</span>`;
}

function estadoBadge(u) {
    if (u.bloqueado) return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600">🔒 Bloqueado</span>';
    if (!u.activo)   return '<span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600">Inactivo</span>';
    return '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:999px;font-size:var(--fs-xs);font-weight:600">Activo</span>';
}
