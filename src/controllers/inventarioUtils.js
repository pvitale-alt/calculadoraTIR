/**
 * Utilidades para procesamiento de inventario FIFO
 */

/**
 * Formatea un número con separador de miles
 */
function formatearNumero(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Calcula el saldo disponible de partidas (excluyendo PA)
 */
function calcularSaldoDisponible(partidas) {
    return partidas
        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
        .reduce((sum, p) => sum + p.saldo, 0);
}

/**
 * Calcula el saldo inicial del día (partidas creadas antes del día actual)
 */
function calcularSaldoInicialDia(partidas, fecha) {
    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    
    return partidas
        .filter(p => {
            if (p.saldo <= 0 || p.tipoMin === 'PA') return false;
            if (!p.fecha) return false;
            return p.fecha.getTime() < inicioDia.getTime();
        })
        .reduce((sum, p) => {
            const imputacionesDelDia = p.imputaciones.filter(imp => {
                if (!imp.fecha) return false;
                return imp.fecha.getFullYear() === fecha.getFullYear() &&
                       imp.fecha.getMonth() === fecha.getMonth() &&
                       imp.fecha.getDate() === fecha.getDate();
            });
            
            if (imputacionesDelDia.length > 0) {
                const saldoInicial = p.saldo - imputacionesDelDia
                    .filter(imp => imp.cantidad > 0)
                    .reduce((s, imp) => s + imp.cantidad, 0) +
                    imputacionesDelDia
                    .filter(imp => imp.cantidad < 0)
                    .reduce((s, imp) => s - imp.cantidad, 0);
                return sum + saldoInicial;
            }
            return sum + p.saldo;
        }, 0);
}

/**
 * Obtiene partidas disponibles para aplicar egresos (FIFO)
 */
function obtenerPartidasDisponibles(partidas, incluirCerradas = false) {
    return partidas
        .filter(p => {
            if (p.tipoMin === 'PA') return false;
            return p.saldo > 0;
        })
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Verifica si dos fechas son del mismo día
 */
function esMismoDia(fecha1, fecha2) {
    if (!fecha1 || !fecha2) return false;
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
}

/**
 * Crea una imputación para una partida
 */
function crearImputacion(movimiento, cantidad, saldoDespues) {
    return {
        tipoMin: movimiento.tipoMin,
        tipoMov: movimiento.tipoMov,
        minutaOrigen: movimiento.minutaOrigen,
        fecha: movimiento.fecha,
        fechaStr: movimiento.fechaStr,
        cantidad: cantidad,
        cantidadOriginal: movimiento.cantidad,
        saldoDespues: saldoDespues
    };
}

module.exports = {
    formatearNumero,
    calcularSaldoDisponible,
    calcularSaldoInicialDia,
    obtenerPartidasDisponibles,
    esMismoDia,
    crearImputacion
};

