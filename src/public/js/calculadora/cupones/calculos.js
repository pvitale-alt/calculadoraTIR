/**
 * Utilidades para cálculos y asignaciones financieras de los cupones
 */

function normalizarNumeroDesdeInput(valor) {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'number') {
        return isNaN(valor) ? null : valor;
    }
    if (typeof valor === 'string') {
        const sanitized = valor.replace(',', '.').trim();
        if (!sanitized) return null;
        const parsed = parseFloat(sanitized);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}

function formatearNumero(valor, decimales = 4) {
    if (!isFinite(valor)) return '';
    const redondeado = parseFloat(valor.toFixed(decimales + 2)); // redondeo intermedio
    if (Number.isInteger(redondeado)) {
        return redondeado.toString();
    }
    return redondeado.toFixed(decimales);
}

function actualizarCampoCupon(cupon, campo, valor) {
    cupon[campo] = valor;
    const input = document.getElementById(`${campo}_${cupon.id}`);
    if (input && input.value !== valor) {
        input.value = valor;
    }
}

function obtenerCantidadPartida() {
    return normalizarNumeroDesdeInput(document.getElementById('cantidadPartida')?.value);
}

function obtenerPrecioCompra() {
    return normalizarNumeroDesdeInput(document.getElementById('precioCompra')?.value);
}

function obtenerCoeficienteCEREmision() {
    const texto = document.getElementById('coefCEREmision')?.textContent || '';
    return normalizarNumeroDesdeTexto(texto);
}

function obtenerCoeficienteCERCompra() {
    const texto = document.getElementById('coefCERCompra')?.textContent || '';
    return normalizarNumeroDesdeTexto(texto);
}

function obtenerDecimalesAjustes() {
    const input = document.getElementById('decimalesAjustes');
    if (input) {
        const valor = parseInt(input.value, 10);
        return isNaN(valor) || valor < 0 ? 8 : Math.min(valor, 12);
    }
    return 8; // Por defecto 8
}

function calcularFlujoInversion(cantidad, precio, coeficiente) {
    if (cantidad === null || precio === null) {
        return null;
    }
    if (coeficiente === null || coeficiente <= 0) {
        return null;
    }
    return -(cantidad * precio * coeficiente);
}

function calcularFlujoCupon(cantidad, amortizacionAjustada, rentaAjustada) {
    if (cantidad === null || cantidad === 0) {
        return null;
    }
    if (amortizacionAjustada === null || rentaAjustada === null) {
        return null;
    }
    return cantidad * ((amortizacionAjustada / 100) + (rentaAjustada / 100));
}

function recalcularFlujosCupones(cupones = window.cuponesModule?.getCuponesData?.() || []) {
    if (!Array.isArray(cupones) || cupones.length === 0) {
        limpiarFlujosCalculados();
        return;
    }

    const cantidadPartida = obtenerCantidadPartida();
    const precioCompra = obtenerPrecioCompra();
    const coeficienteCERCompra = obtenerCoeficienteCERCompra();

    cupones.forEach(cupon => {
        let flujoCalculado = null;

        if (cupon.id === 'inversion') {
            flujoCalculado = calcularFlujoInversion(cantidadPartida, precioCompra, coeficienteCERCompra);
        } else {
            const amortizacionAjustada = normalizarNumeroDesdeInput(cupon.amortizAjustada);
            const rentaAjustada = normalizarNumeroDesdeInput(cupon.rentaAjustada);
            flujoCalculado = calcularFlujoCupon(cantidadPartida, amortizacionAjustada, rentaAjustada);
        }

        if (flujoCalculado === null || !isFinite(flujoCalculado)) {
            actualizarCampoCupon(cupon, 'flujos', '');
        } else {
            actualizarCampoCupon(cupon, 'flujos', formatearNumero(flujoCalculado, 8));
        }
    });

    if (window.tirModule && typeof window.tirModule.actualizarFlujosDescontadosYSumatoria === 'function') {
        window.tirModule.actualizarFlujosDescontadosYSumatoria();
    }
}

function limpiarFlujosCalculados() {
    const cupones = window.cuponesModule?.getCuponesData?.() || [];
    cupones.forEach(cupon => {
        actualizarCampoCupon(cupon, 'flujos', '');
        actualizarCampoCupon(cupon, 'flujosDesc', '');
    });
}

function normalizarNumeroDesdeTexto(texto) {
    if (typeof texto !== 'string') return normalizarNumeroDesdeInput(texto);
    return normalizarNumeroDesdeInput(texto.replace(',', '.').trim());
}

function obtenerDecimalesAjustes() {
    // Usar la función global si está disponible, sino usar implementación local
    if (typeof window.obtenerDecimalesAjustes === 'function') {
        return window.obtenerDecimalesAjustes();
    }
    const input = document.getElementById('decimalesAjustes');
    if (!input) return 8; // Default: 8 decimales
    const valor = parseInt(input.value, 10);
    if (isNaN(valor) || valor < 0 || valor > 12) return 8;
    return valor;
}

function aplicarRentaTNAEnCupones(cupones, rentaTNA) {
    const valor = rentaTNA ?? '';
    if (!Array.isArray(cupones)) return;
    cupones.forEach(cupon => {
        if (!cupon || cupon.id === 'inversion') return;
        actualizarCampoCupon(cupon, 'rentaTNA', valor);
    });
}

function aplicarAmortizacionEnCupones(cupones, porcentajeAmortizacion) {
    if (!Array.isArray(cupones) || cupones.length === 0) return;
    
    const porcentaje = normalizarNumeroDesdeInput(porcentajeAmortizacion);
    const cuponesRegulares = cupones.filter(c => c && c.id !== 'inversion');
    
    cuponesRegulares.forEach(cupon => {
        actualizarCampoCupon(cupon, 'amortiz', '0');
    });
    
    if (porcentaje === null || porcentaje <= 0 || cuponesRegulares.length === 0) {
        return;
    }
    
    let restante = 100;
    for (let i = cuponesRegulares.length - 1; i >= 0 && restante > 0; i--) {
        const valor = Math.min(porcentaje, restante);
        actualizarCampoCupon(cuponesRegulares[i], 'amortiz', formatearNumero(valor, 4));
        restante = parseFloat((restante - valor).toFixed(6));
    }
    
    if (restante > 0 && cuponesRegulares.length > 0) {
        const valorActual = normalizarNumeroDesdeInput(cuponesRegulares[0].amortiz) || 0;
        actualizarCampoCupon(cuponesRegulares[0], 'amortiz', formatearNumero(valorActual + restante, 4));
    }
}

/**
 * Calcular factor de actualización para un cupón
 * Factor = (1 + TIR) ^ (FRAC Año entre fecha liq cupon y fecha valuacion)
 */
function calcularFactorActualizacion(cupon) {
    // Obtener TIR
    const tir = window.tirModule?.getUltimaTIR?.() || null;
    if (tir === null) {
        return null;
    }
    
    // Obtener fecha de valuación
    const fechaValuacionStr = document.getElementById('fechaValuacion')?.value;
    if (!fechaValuacionStr) {
        return null;
    }
    
    // Obtener fecha liquidación del cupón
    if (!cupon.fechaLiquid) {
        return null;
    }
    
    // Convertir fechas a formato ISO (YYYY-MM-DD)
    let fechaValuacionISO = fechaValuacionStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaValuacionISO)) {
        fechaValuacionISO = convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionISO);
    }
    
    let fechaLiquidISO = cupon.fechaLiquid;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaLiquidISO)) {
        fechaLiquidISO = convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquidISO);
    }
    
    // Obtener tipoInteresDias
    const tipoInteresDias = parseInt(document.getElementById('tipoInteresDias')?.value || '0', 10);
    
    // Calcular fracción de año entre fecha liquidación y fecha valuación
    const fraccionAnio = calcularFraccionAnio(fechaLiquidISO, fechaValuacionISO, tipoInteresDias);
    
    if (fraccionAnio <= 0) {
        return 1; // Si la fracción es 0 o negativa, el factor es 1
    }
    
    // Calcular factor = (1 + TIR) ^ fraccionAnio
    const factor = Math.pow(1 + tir, fraccionAnio);
    return factor;
}

/**
 * Calcular pagos actualizados para un cupón
 * Pagos Actualizados = (amortizacion ajustada * Factor actualizacion / 100) + (Renta ajustada * factor actualizacion /100)
 */
function calcularPagosActualizados(cupon, factorActualizacion) {
    if (factorActualizacion === null) {
        return null;
    }
    
    const amortizacionAjustada = normalizarNumeroDesdeInput(cupon.amortizAjustada) || 0;
    const rentaAjustada = normalizarNumeroDesdeInput(cupon.rentaAjustada) || 0;
    
    const pagosActualizados = (amortizacionAjustada * factorActualizacion / 100) + (rentaAjustada * factorActualizacion / 100);
    return pagosActualizados;
}

function recalcularValoresDerivados(cupones, opciones = {}) {
    if (!Array.isArray(cupones) || cupones.length === 0) return;
    
    const rentaTNAValor = normalizarNumeroDesdeInput(opciones.rentaTNA ?? document.getElementById('rentaTNA')?.value);
    const coeficienteCEREmision = obtenerCoeficienteCEREmision() || 1;
    const decimalesAjustes = obtenerDecimalesAjustes();
    
    let residual = 100;
    cupones.forEach(cupon => {
        if (!cupon || cupon.id === 'inversion') {
            return;
        }
        
        const amortizacionActual = normalizarNumeroDesdeInput(cupon.amortiz) || 0;
        const residualActual = Math.max(0, residual);
        actualizarCampoCupon(cupon, 'valorResidual', formatearNumero(residualActual, 4));
        
        const amortizAjustada = amortizacionActual * coeficienteCEREmision;
        actualizarCampoCupon(cupon, 'amortizAjustada', formatearNumero(amortizAjustada, decimalesAjustes));
        
        const dayCount = normalizarNumeroDesdeInput(cupon.dayCountFactor) || 0;
        const rentaNominal = (rentaTNAValor || 0) * dayCount;
        actualizarCampoCupon(cupon, 'rentaNominal', formatearNumero(rentaNominal, 5));
        
        const residualFactor = residualActual / 100;
        const rentaAjustada = rentaNominal * coeficienteCEREmision * residualFactor;
        actualizarCampoCupon(cupon, 'rentaAjustada', formatearNumero(rentaAjustada, decimalesAjustes));
        
        // Calcular factor de actualización
        const factorActualizacion = calcularFactorActualizacion(cupon);
        if (factorActualizacion !== null) {
            actualizarCampoCupon(cupon, 'factorActualiz', formatearNumero(factorActualizacion, decimalesAjustes));
            
            // Calcular pagos actualizados
            const pagosActualizados = calcularPagosActualizados(cupon, factorActualizacion);
            if (pagosActualizados !== null) {
                actualizarCampoCupon(cupon, 'pagosActualiz', formatearNumero(pagosActualizados, decimalesAjustes));
            } else {
                actualizarCampoCupon(cupon, 'pagosActualiz', '');
            }
        } else {
            actualizarCampoCupon(cupon, 'factorActualiz', '');
            actualizarCampoCupon(cupon, 'pagosActualiz', '');
        }
        
        residual = Math.max(0, residualActual - amortizacionActual);
    });
    
    recalcularFlujosCupones(cupones);
}

function aplicarValoresFinancierosEnCupones(cupones, opciones = {}) {
    if (!Array.isArray(cupones) || cupones.length === 0) {
        return;
    }
    
    const debeActualizarAmortizacion = opciones.actualizarAmortizacion !== false;
    const debeActualizarRenta = opciones.actualizarRenta !== false;
    
    if (debeActualizarRenta) {
        const rentaTNA = opciones.rentaTNA ?? document.getElementById('rentaTNA')?.value ?? '';
        aplicarRentaTNAEnCupones(cupones, rentaTNA);
    }
    
    if (debeActualizarAmortizacion) {
        const porcentajeAmortizacion = opciones.porcentajeAmortizacion ?? document.getElementById('porcentajeAmortizacion')?.value ?? '';
        aplicarAmortizacionEnCupones(cupones, porcentajeAmortizacion);
    }
    
    recalcularValoresDerivados(cupones, opciones);
    
    if (opciones.forceRender && window.cuponesModule && typeof window.cuponesModule.renderizarCupones === 'function') {
        window.cuponesModule.renderizarCupones();
        // Reaplicar para reflejar los valores en el nuevo DOM
        recalcularValoresDerivados(cupones, { ...opciones, forceRender: false });
    }
}

/**
 * Placeholders para cálculos futuros - se mantienen para compatibilidad
 */
function calcularDayCountFactor(fechaInicio, fechaFin, tipoInteresDias) {
    return 0;
}

function calcularRentaNominal(rentaTNA, dayCountFactor) {
    return rentaTNA * dayCountFactor;
}

function calcularTIR(flujos, fechas, fechaCompra) {
    return 0;
}

window.cuponesCalculos = {
    aplicarRentaTNAEnCupones,
    aplicarAmortizacionEnCupones,
    recalcularValoresDerivados,
    aplicarValoresFinancieros: aplicarValoresFinancierosEnCupones,
    calcularDayCountFactor,
    calcularRentaNominal,
    calcularTIR,
    recalcularFlujos: recalcularFlujosCupones
};

