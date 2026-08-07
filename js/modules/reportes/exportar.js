// reportes/exportar.js — Descarga real a Excel (.xlsx) y PDF (.pdf)
// Usa SheetJS (XLSX) y jsPDF + autotable, cargadas por CDN en index.html.

/**
 * Descarga datos como archivo Excel .xlsx real.
 * @param {string} nombreArchivo - sin extensión
 * @param {string[]} columnas - encabezados
 * @param {Array<Array>} filas - matriz de valores
 */
export function descargarExcel(nombreArchivo, columnas, filas) {
    if (typeof XLSX === 'undefined') {
        alert('No se pudo cargar la librería de Excel. Verifica tu conexión a internet.');
        return;
    }
    // Armar hoja: encabezados + filas
    const datos = [columnas, ...filas];
    const hoja = XLSX.utils.aoa_to_sheet(datos);

    // Ancho de columnas automático (aprox. según el contenido más largo)
    hoja['!cols'] = columnas.map((col, i) => {
        const maxLargo = Math.max(
            col.length,
            ...filas.map(f => String(f[i] ?? '').length)
        );
        return { wch: Math.min(maxLargo + 2, 40) };
    });

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

/**
 * Descarga datos como PDF real con tabla formateada.
 * @param {string} titulo
 * @param {string} subtitulo
 * @param {string[]} columnas
 * @param {Array<Array>} filas
 */
export function descargarPDF(titulo, subtitulo, columnas, filas) {
    if (typeof window.jspdf === 'undefined') {
        alert('No se pudo cargar la librería de PDF. Verifica tu conexión a internet.');
        return;
    }
    const { jsPDF } = window.jspdf;
    // Orientación horizontal si hay muchas columnas
    const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait' });

    // Encabezado
    doc.setFontSize(15);
    doc.setTextColor(37, 99, 235);
    doc.text(titulo, 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitulo, 14, 22);

    // Tabla con autotable
    doc.autoTable({
        head: [columnas],
        body: filas.map(f => f.map(c => String(c ?? ''))),
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        margin: { left: 14, right: 14 },
    });

    // Pie con fecha
    const fecha = new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' });
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado ${fecha} · Clínica Dental · Página ${i}/${totalPaginas}`,
            14, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`${titulo.replace(/\s+/g, '_')}.pdf`);
}
