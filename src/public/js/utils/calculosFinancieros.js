/**
 * Utilidades financieras: fracción de año y day count.
 * Replica la lógica usada en la calculadora principal para FRAC.AÑO.
 */

function obtenerFechaLocal(fecha) {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') {
        // Intentar crear fecha usando helper global para YYYY-MM-DD
        const desdeHelper = crearFechaDesdeString(fecha);
        if (desdeHelper && !isNaN(desdeHelper.getTime())) {
            return desdeHelper;
        }
    }
    const directa = new Date(fecha);
    return isNaN(directa.getTime()) ? null : directa;
}

function esAnioBisiesto(anio) {
    return (anio % 4 === 0 && anio % 100 !== 0) || (anio % 400 === 0);
}

function calcular30_360US(inicio, fin) {
    let diaInicio = inicio.getDate();
    let diaFin = fin.getDate();

    if (diaInicio === 31) diaInicio = 30;
    if (diaFin === 31) {
        if (diaInicio >= 30) {
            diaFin = 30;
        }
    }

    const añoInicio = inicio.getFullYear();
    const mesInicio = inicio.getMonth();
    const añoFin = fin.getFullYear();
    const mesFin = fin.getMonth();

    const dias = (añoFin - añoInicio) * 360 + (mesFin - mesInicio) * 30 + (diaFin - diaInicio);
    return dias / 360;
}

function calcular30_360European(inicio, fin) {
    let diaInicio = inicio.getDate();
    let diaFin = fin.getDate();

    if (diaInicio === 31) diaInicio = 30;
    if (diaFin === 31) diaFin = 30;

    const añoInicio = inicio.getFullYear();
    const mesInicio = inicio.getMonth();
    const añoFin = fin.getFullYear();
    const mesFin = fin.getMonth();

    const dias = (añoFin - añoInicio) * 360 + (mesFin - mesInicio) * 30 + (diaFin - diaInicio);
    return dias / 360;
}

function calcularActualActual(inicio, fin) {
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasReales = (fin - inicio) / msPorDia;
    const añoInicio = inicio.getFullYear();
    const añoFin = fin.getFullYear();

    if (añoInicio === añoFin) {
        const diasEnAño = esAnioBisiesto(añoInicio) ? 366 : 365;
        return diasReales / diasEnAño;
    }

    const finAñoInicio = new Date(añoInicio, 11, 31);
    const inicioAñoFin = new Date(añoFin, 0, 1);

    const diasAñoInicio = Math.max(0, (finAñoInicio - inicio) / msPorDia + 1);
    const diasAñoFin = Math.max(0, (fin - inicioAñoFin) / msPorDia + 1);

    const diasEnAñoInicio = esAnioBisiesto(añoInicio) ? 366 : 365;
    const diasEnAñoFin = esAnioBisiesto(añoFin) ? 366 : 365;

    return (diasAñoInicio / diasEnAñoInicio) + (diasAñoFin / diasEnAñoFin);
}

function calcularActual360(inicio, fin) {
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasReales = (fin - inicio) / msPorDia;
    return diasReales / 360;
}

function calcularActual365(inicio, fin) {
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasReales = (fin - inicio) / msPorDia;
    return diasReales / 365;
}

/**
 * Implementación de FRAC.AÑO de Excel.
 * base:
 * 0 = US (NASD) 30/360
 * 1 = Real/real
 * 2 = Real/360
 * 3 = Real/365
 * 4 = European 30/360
 */
function fracAno(fechaInicio, fechaFin, base = 0) {
    const inicio = obtenerFechaLocal(fechaInicio);
    const fin = obtenerFechaLocal(fechaFin);

    if (!inicio || !fin) return 0;
    if (inicio.getTime() === fin.getTime()) return 0;
    if (inicio > fin) return 0;

    switch (parseInt(base, 10)) {
        case 0:
            return calcular30_360US(inicio, fin);
        case 1:
            return calcularActualActual(inicio, fin);
        case 2:
            return calcularActual360(inicio, fin);
        case 3:
            return calcularActual365(inicio, fin);
        case 4:
            return calcular30_360European(inicio, fin);
        default:
            return calcular30_360US(inicio, fin);
    }
}

function calcularFraccionAnio(fechaInicio, fechaFin, tipoInteresDias = 0) {
    return fracAno(fechaInicio, fechaFin, tipoInteresDias ?? 0);
}

window.calculosFinancieros = {
    fracAno,
    calcularFraccionAnio
};

window.fracAno = fracAno;
window.calcularFraccionAnio = calcularFraccionAnio;








