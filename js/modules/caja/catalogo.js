// caja/catalogo.js — Tasa de cambio y métodos de pago (cache compartida)

import Api from '../../core/api.js';

let _tasa    = null;
let _metodos = null;

export async function cargarCatalogos() {
    const [resTasa, resMet] = await Promise.all([
        Api.get('/api/tasas-cambio/activa'),
        Api.get('/api/pagos/metodos')
    ]);
    _tasa    = resTasa.ok ? resTasa.datos : null;
    _metodos = resMet.ok  ? resMet.datos  : [];
}

export function getTasa()    { return _tasa; }
export function getMetodos() { return _metodos; }

export function tasaHTML() {
    return _tasa
        ? `💱 Compra: <strong>C$${_tasa.tasaCompra}</strong> · Venta: <strong>C$${_tasa.tasaVenta}</strong>`
        : '💱 Sin tasa';
}
