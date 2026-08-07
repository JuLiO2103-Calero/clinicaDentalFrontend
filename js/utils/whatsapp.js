// utils/whatsapp.js — Abrir WhatsApp con el chat del paciente
// Funciona en la app de escritorio/móvil y en WhatsApp Web.

// Código de país por defecto (Nicaragua = 505). Ajustar si aplica.
const CODIGO_PAIS = '505';

/**
 * Normaliza un teléfono a formato internacional sin símbolos ni el signo +.
 * Nicaragua: números de 8 dígitos reciben el código 505 adelante.
 * "8888-1234"    -> "50588881234"
 * "7636-2223"    -> "50576362223"
 * "+505 76362223"-> "50576362223"
 */
function normalizarTelefono(telefono) {
    if (!telefono) return null;
    // Quitar TODO lo que no sea dígito (incluye +, espacios, guiones, paréntesis)
    let limpio = String(telefono).replace(/\D/g, '');
    if (!limpio) return null;

    // Si ya empieza con el código de país 505, dejarlo tal cual
    if (limpio.startsWith(CODIGO_PAIS)) {
        return limpio;
    }

    // Número local nicaragüense (8 dígitos) -> anteponer 505
    if (limpio.length === 8) {
        return CODIGO_PAIS + limpio;
    }

    // Casos con dígitos de más al inicio pero que terminan en 8 dígitos locales:
    // si tiene entre 9 y 10 dígitos y NO empieza con 505, tomamos los últimos 8
    // y les ponemos el código de país (cubre números guardados con un 0 o 1 extra).
    if (limpio.length > 8 && limpio.length < 11) {
        return CODIGO_PAIS + limpio.slice(-8);
    }

    // 11+ dígitos sin 505: asumimos que ya es internacional completo
    return limpio;
}

/**
 * Abre WhatsApp con el chat del número indicado y un mensaje opcional.
 * @param {string} telefono
 * @param {string} [mensaje] - texto prellenado (opcional)
 * @returns {boolean} true si se abrió, false si el teléfono no es válido
 */
export function abrirWhatsApp(telefono, mensaje = '') {
    const num = normalizarTelefono(telefono);
    if (!num) return false;
    const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
    const url = `https://wa.me/${num}${texto}`;
    window.open(url, '_blank');
    return true;
}

/**
 * Arma el mensaje de recordatorio de cita.
 * @param {object} datos - { paciente, fecha, hora, servicio }
 */
export function mensajeRecordatorioCita({ paciente, fecha, hora, servicio }) {
    const nombre = paciente || 'estimado paciente';
    const serv = servicio && servicio !== 'Sin servicio' ? servicio : 'su consulta';
    return `Buen día ${nombre}, le saludamos de la Clínica Dental. ` +
        `Le recordamos que tiene una cita el día ${fecha}` +
        (hora ? ` a las ${hora}` : '') +
        ` para realizarse ${serv}. ` +
        `Por favor confirme su asistencia. ¡Gracias!`;
}