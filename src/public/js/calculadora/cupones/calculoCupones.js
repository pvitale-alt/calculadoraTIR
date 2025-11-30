/**
 * Módulo para calcular fechas de cupones basado en periodicidad
 */

function obtenerDiaPago(fechaPrimeraRenta) {
    if (!fechaPrimeraRenta) return null;
    const valor = fechaPrimeraRenta.toString().trim();
    if (/^\d{1,2}$/.test(valor)) {
        const dia = parseInt(valor, 10);
        return dia >= 1 && dia <= 31 ? dia : null;
    }
    if (/^\d{1,2}\/\d{1,2}$/.test(valor)) {
        const partes = valor.split('/');
        const dia = parseInt(partes[0], 10);
        return dia >= 1 && dia <= 31 ? dia : null;
    }
    return null;
}

function obtenerMesesPorPeriodo(periodicidad = '') {
    switch ((periodicidad || '').toLowerCase()) {
        case 'mensual':
            return 1;
        case 'bimestral':
            return 2;
        case 'trimestral':
            return 3;
        case 'semestral':
            return 6;
        case 'anual':
            return 12;
        default:
            return null;
    }
}

function ajustarDiaAlMes(fechaBase, diaPago) {
    const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
    const ultimoDia = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate();
    fecha.setDate(Math.min(Math.max(1, diaPago), ultimoDia));
    return fecha;
}

function obtenerPrimeraFechaPago(fechaEmision, diaPago) {
    const fechaInicial = ajustarDiaAlMes(fechaEmision, diaPago);
    if (fechaInicial >= fechaEmision) {
        return fechaInicial;
    }
    const siguienteMes = new Date(fechaEmision);
    siguienteMes.setMonth(siguienteMes.getMonth() + 1);
    return ajustarDiaAlMes(siguienteMes, diaPago);
}

/**
 * Calcular el número del cupón vigente en la fecha de compra
 * El cupón vigente es el que tiene fecha de pago >= fecha de compra
 * @param {Date} fechaEmision - Fecha de emisión
 * @param {string} fechaPrimeraRenta - Día de pago (1-31)
 * @param {string} periodicidad - Periodicidad: 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'
 * @param {Date} fechaCompra - Fecha de compra
 * @returns {number} Número del cupón vigente en la fecha de compra (1-based)
 */
function calcularNumeroPrimerCupon(fechaEmision, fechaPrimeraRenta, periodicidad, fechaCompra) {
    if (!fechaEmision || !fechaPrimeraRenta || !periodicidad || !fechaCompra) {
        return 1;
    }
    
    const diaPago = obtenerDiaPago(fechaPrimeraRenta);
    if (diaPago === null) {
        return 1;
    }
    
    const mesesPorPeriodo = obtenerMesesPorPeriodo(periodicidad);
    if (!mesesPorPeriodo) {
        return 1;
    }
    
    const primeraFechaPago = obtenerPrimeraFechaPago(fechaEmision, diaPago);
    
    // Encontrar el cupón vigente (fecha de pago >= fecha de compra)
    let numeroCupon = 1;
    let fechaActual = new Date(primeraFechaPago);
    const fechaLimite = new Date(fechaEmision);
    fechaLimite.setFullYear(fechaLimite.getFullYear() + 10);
    
    // Avanzar hasta encontrar el cupón vigente
    while (fechaActual < fechaCompra && fechaActual <= fechaLimite) {
        fechaActual.setMonth(fechaActual.getMonth() + mesesPorPeriodo);
        fechaActual = ajustarDiaAlMes(fechaActual, diaPago);
        numeroCupon++;
        
        // Si la fecha actual es >= fecha de compra, este es el cupón vigente
        if (fechaActual >= fechaCompra) {
            break;
        }
    }
    
    return numeroCupon;
}

/**
 * Calcular fechas de cupones basado en fecha emisión, fecha pago y periodicidad
 * Calcula desde la fecha de amortización hacia atrás, incluyendo el cupón vigente en la fecha de compra
 * @param {Date} fechaEmision - Fecha de emisión
 * @param {string} fechaPrimeraRenta - Día de pago (1-31)
 * @param {string} periodicidad - Periodicidad: 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'
 * @param {Date} fechaCompra - Fecha de compra (incluir cupón vigente en esta fecha)
 * @param {Date} fechaAmortizacion - Fecha de amortización (último cupón)
 * @returns {Array<Date>} Array de fechas de cupones ordenadas (incluye el vigente en fecha de compra)
 */
function calcularFechasCupones(fechaEmision, fechaPrimeraRenta, periodicidad, fechaCompra, fechaAmortizacion) {
    if (!fechaEmision || !fechaPrimeraRenta || !periodicidad) {
        return [];
    }
    
    const diaPago = obtenerDiaPago(fechaPrimeraRenta);
    if (diaPago === null) {
        return [];
    }
    
    const mesesPorPeriodo = obtenerMesesPorPeriodo(periodicidad);
    if (!mesesPorPeriodo) {
        return [];
    }
    
    // Normalizar fechas para comparación (solo año, mes, día, sin horas)
    const normalizarFecha = (fecha) => {
        return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };
    
    const fechaCompraNormalizada = normalizarFecha(fechaCompra);
    const fechaEmisionNormalizada = normalizarFecha(fechaEmision);
    
    // Si no hay fecha de amortización, calcular hacia adelante desde fecha emisión
    if (!fechaAmortizacion) {
        let primeraFechaPago = obtenerPrimeraFechaPago(fechaEmision, diaPago);
        const primeraFechaPagoNormalizada = normalizarFecha(primeraFechaPago);
        
        // Encontrar el cupón vigente
        let fechaCuponVigente = new Date(primeraFechaPago);
        let contador = 0;
        const maxCupones = 120;
        
        if (fechaCompraNormalizada.getTime() === fechaEmisionNormalizada.getTime()) {
            if (primeraFechaPagoNormalizada >= fechaCompraNormalizada) {
                fechaCuponVigente = new Date(primeraFechaPago);
            } else {
                fechaCuponVigente.setMonth(fechaCuponVigente.getMonth() + mesesPorPeriodo);
                fechaCuponVigente = ajustarDiaAlMes(fechaCuponVigente, diaPago);
            }
        } else if (primeraFechaPagoNormalizada >= fechaCompraNormalizada) {
            fechaCuponVigente = new Date(primeraFechaPago);
        } else {
            fechaCuponVigente = new Date(primeraFechaPago);
            while (contador < maxCupones) {
                const fechaCuponVigenteNormalizada = normalizarFecha(fechaCuponVigente);
                if (fechaCuponVigenteNormalizada >= fechaCompraNormalizada) {
                    break;
                }
                fechaCuponVigente.setMonth(fechaCuponVigente.getMonth() + mesesPorPeriodo);
                fechaCuponVigente = ajustarDiaAlMes(fechaCuponVigente, diaPago);
                contador++;
            }
        }
        
        // Generar cupones hacia adelante
        const fechasCupones = [];
        const fechaLimite = new Date(fechaEmision);
        fechaLimite.setFullYear(fechaLimite.getFullYear() + 10);
        const fechaLimiteNormalizada = normalizarFecha(fechaLimite);
        const fechaCuponVigenteNormalizada = normalizarFecha(fechaCuponVigente);
        
        if (fechaCuponVigenteNormalizada <= fechaLimiteNormalizada) {
            fechasCupones.push(fechaCuponVigenteNormalizada);
        }
        
        let fechaActual = new Date(fechaCuponVigente);
        fechaActual.setMonth(fechaActual.getMonth() + mesesPorPeriodo);
        fechaActual = ajustarDiaAlMes(fechaActual, diaPago);
        contador = 0;
        
        while (contador < maxCupones) {
            const fechaActualNormalizada = normalizarFecha(fechaActual);
            if (fechaActualNormalizada > fechaLimiteNormalizada) {
                break;
            }
            const yaExiste = fechasCupones.some(fecha => fecha.getTime() === fechaActualNormalizada.getTime());
            if (!yaExiste) {
                fechasCupones.push(fechaActualNormalizada);
            }
            fechaActual.setMonth(fechaActual.getMonth() + mesesPorPeriodo);
            fechaActual = ajustarDiaAlMes(fechaActual, diaPago);
            contador++;
        }
        
        return fechasCupones;
    }
    
    // Si hay fecha de amortización, calcular desde esa fecha hacia atrás
    const fechaAmortizacionNormalizada = normalizarFecha(fechaAmortizacion);
    
    // Ajustar la fecha de amortización al día de pago correspondiente
    let fechaUltimoCupon = ajustarDiaAlMes(fechaAmortizacion, diaPago);
    const fechaUltimoCuponNormalizada = normalizarFecha(fechaUltimoCupon);
    
    // Si la fecha ajustada es mayor a la fecha de amortización, retroceder un período
    if (fechaUltimoCuponNormalizada > fechaAmortizacionNormalizada) {
        fechaUltimoCupon.setMonth(fechaUltimoCupon.getMonth() - mesesPorPeriodo);
        fechaUltimoCupon = ajustarDiaAlMes(fechaUltimoCupon, diaPago);
    }
    
    // Calcular todas las fechas de cupones desde la fecha de amortización hacia atrás
    const fechasCupones = [];
    const fechaMinima = fechaEmisionNormalizada;
    let fechaActual = new Date(fechaUltimoCupon);
    let contador = 0;
    const maxCupones = 120;
    
    // Agregar cupones desde la fecha de amortización hacia atrás hasta la fecha de emisión
    while (contador < maxCupones) {
        const fechaActualNormalizada = normalizarFecha(fechaActual);
        
        // Si pasamos la fecha de emisión, detener
        if (fechaActualNormalizada < fechaMinima) {
            break;
        }
        
        // Verificar que no esté duplicado
        const yaExiste = fechasCupones.some(fecha => {
            return fecha.getTime() === fechaActualNormalizada.getTime();
        });
        
        if (!yaExiste) {
            fechasCupones.push(fechaActualNormalizada);
        }
        
        // Retroceder al cupón anterior
        fechaActual.setMonth(fechaActual.getMonth() - mesesPorPeriodo);
        fechaActual = ajustarDiaAlMes(fechaActual, diaPago);
        contador++;
    }
    
    // Ordenar las fechas de menor a mayor (más antigua a más reciente)
    fechasCupones.sort((a, b) => a.getTime() - b.getTime());
    
    // Eliminar duplicados después de ordenar
    const fechasCuponesSinDuplicados = [];
    fechasCupones.forEach(fecha => {
        const yaExiste = fechasCuponesSinDuplicados.some(f => f.getTime() === fecha.getTime());
        if (!yaExiste) {
            fechasCuponesSinDuplicados.push(fecha);
        }
    });
    
    // Determinar si es caso borde: fecha compra = fecha emisión
    const esCompraMismoQueEmision = fechaCompraNormalizada.getTime() === fechaEmisionNormalizada.getTime();
    
    // Filtrar cupones según el caso:
    // - Si fecha compra = fecha emisión: solo incluir cupones con fecha > fecha compra
    //   (porque la fecha de pago del primer cupón debe ser posterior a la emisión)
    // - Si fecha compra > fecha emisión: incluir cupones con fecha >= fecha compra
    //   (el cupón vigente es el primero con fecha de pago >= fecha compra)
    const fechasCuponesFiltradas = fechasCuponesSinDuplicados.filter(fecha => {
        if (esCompraMismoQueEmision) {
            // Caso borde: solo cupones con fecha de pago > fecha compra/emisión
            return fecha.getTime() > fechaCompraNormalizada.getTime();
        } else {
            // Caso normal: cupones con fecha de pago >= fecha compra
            return fecha.getTime() >= fechaCompraNormalizada.getTime();
        }
    });
    
    // Si no hay cupones después de la fecha de compra, incluir el primer cupón posterior
    if (fechasCuponesFiltradas.length === 0 && fechasCuponesSinDuplicados.length > 0) {
        // Encontrar el primer cupón posterior a la fecha de compra
        const cuponesPosteriores = fechasCuponesSinDuplicados.filter(f => f.getTime() > fechaCompraNormalizada.getTime());
        if (cuponesPosteriores.length > 0) {
            return [cuponesPosteriores[0]];
        }
        // Si no hay ninguno posterior, usar el más cercano
        const cuponMasCercano = fechasCuponesSinDuplicados.reduce((masCercano, fecha) => {
            const diffActual = Math.abs(fecha.getTime() - fechaCompraNormalizada.getTime());
            const diffMasCercano = Math.abs(masCercano.getTime() - fechaCompraNormalizada.getTime());
            return diffActual < diffMasCercano ? fecha : masCercano;
        });
        return [cuponMasCercano];
    }
    
    return fechasCuponesFiltradas;
}

/**
 * Calcular fecha fin de devengamiento basado en fechaPrimeraRenta y periodicidad
 * @param {Date} fechaPago - Fecha de pago del cupón
 * @param {string} fechaPrimeraRenta - Día de pago (1-31)
 * @param {string} periodicidad - Periodicidad: 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'
 * @param {number} diasRestar - Días a restar (normalmente negativo, ej: -1)
 * @returns {Date} Fecha fin de devengamiento
 */
function calcularFechaFinDev(fechaPago, fechaPrimeraRenta, periodicidad, diasRestar) {
    const fecha = new Date(fechaPago);
    const dias = parseInt(diasRestar, 10);
    const diasAjuste = isNaN(dias) ? -1 : dias;
    fecha.setDate(fecha.getDate() + diasAjuste);
    return fecha;
}

/**
 * Calcular fecha inicio (fecha fin dev + 1)
 * @param {Date} fechaFinDev - Fecha fin de devengamiento
 * @returns {Date} Fecha inicio
 */
function calcularFechaInicio(fechaFinDev) {
    const fecha = new Date(fechaFinDev);
    fecha.setDate(fecha.getDate() + 1);
    return fecha;
}

// Exportar funciones
window.cuponesCalculoCupones = {
    calcularNumeroPrimerCupon,
    calcularFechasCupones,
    calcularFechaFinDev,
    calcularFechaInicio
};

