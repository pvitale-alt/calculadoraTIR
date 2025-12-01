/**
 * Módulo de precios para calculadora TIR
 * Funciones para calcular diferentes tipos de precios
 */

// Función para calcular Precio C+T
function calcularPrecioCT() {
    const precioCompraInput = document.getElementById('precioCompra');
    const fechaCompraInput = document.getElementById('fechaCompra');
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const tipoInteresDiasInput = document.getElementById('tipoInteresDias');
    
    if (!precioCompraInput || !precioCompraInput.value || 
        !fechaCompraInput || !fechaCompraInput.value ||
        !fechaValuacionInput || !fechaValuacionInput.value ||
        !window.tirModule || window.tirModule.getUltimaTIR() === null) {
        const precioCTDiv = document.getElementById('precioCT');
        if (precioCTDiv) precioCTDiv.textContent = '-';
        return;
    }
    
    // Convertir número con coma decimal a punto decimal
    const precioCompraStr = precioCompraInput.value.replace(',', '.');
    const precioCompra = parseFloat(precioCompraStr) || 0;
    const ultimaTIR = window.tirModule.getUltimaTIR();
    
    // Convertir fechas a formato YYYY-MM-DD
    let fechaCompraStr = fechaCompraInput.value;
    let fechaValuacionStr = fechaValuacionInput.value;
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaCompraStr)) {
        fechaCompraStr = convertirFechaDDMMAAAAaYYYYMMDD(fechaCompraStr);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaValuacionStr)) {
        fechaValuacionStr = convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr);
    }
    
    if (!fechaCompraStr || !fechaValuacionStr) {
        const precioCTDiv = document.getElementById('precioCT');
        if (precioCTDiv) precioCTDiv.textContent = '-';
        return;
    }
    
    const tipoInteresDias = parseInt(tipoInteresDiasInput?.value) || 0;
    
    // Calcular fracción de año entre fecha compra y fecha valuación
    const fraccionAnio = calcularFraccionAnio(fechaCompraStr, fechaValuacionStr, tipoInteresDias);
    
    // Precio C+T = precioCompra × (1 + TIR) ^ fracción año
    const precioCT = precioCompra * Math.pow(1 + ultimaTIR, fraccionAnio);
    const valorTruncado = window.truncarDecimal ? window.truncarDecimal(precioCT, 12) : parseFloat(precioCT.toFixed(12));
    
    // Obtener decimales de ajustes para mostrar
    const decimalesAjustes = (typeof window.obtenerDecimalesAjustes === 'function') ? window.obtenerDecimalesAjustes() : 8;
    
    const precioCTDiv = document.getElementById('precioCT');
    if (precioCTDiv) {
        precioCTDiv.textContent = valorTruncado.toFixed(decimalesAjustes);
    }
}

// Función para calcular Precio C+T Ajustado (solo para calculadoras con ajuste CER)
function calcularPrecioCTAjustado() {
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    
    if (!ajusteCER) {
        const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
        if (precioCTHoyAjustadoDiv) precioCTHoyAjustadoDiv.textContent = '-';
        return;
    }
    
    const precioCTDiv = document.getElementById('precioCT');
    
    if (!precioCTDiv || precioCTDiv.textContent === '-') {
        const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
        if (precioCTHoyAjustadoDiv) precioCTHoyAjustadoDiv.textContent = '-';
        return;
    }
    
    const precioCT = parseFloat(precioCTDiv.textContent) || 0;
    
    // Obtener Coef. CER Compra del elemento en el DOM
    const coefCERCompraElement = document.getElementById('coefCERCompra');
    if (!coefCERCompraElement || !coefCERCompraElement.textContent || coefCERCompraElement.textContent === '-') {
        const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
        if (precioCTHoyAjustadoDiv) precioCTHoyAjustadoDiv.textContent = '-';
        return;
    }
    
    const coefCERCompraStr = coefCERCompraElement.textContent.replace(',', '.');
    const coefCERCompra = parseFloat(coefCERCompraStr) || 0;
    
    if (coefCERCompra === 0) {
        const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
        if (precioCTHoyAjustadoDiv) precioCTHoyAjustadoDiv.textContent = '-';
        return;
    }
    
    // Precio C+T Ajustado = Precio C+T × Coef. CER Compra
    const precioCTAjustado = precioCT * coefCERCompra;
    const valorTruncado = window.truncarDecimal ? window.truncarDecimal(precioCTAjustado, 12) : parseFloat(precioCTAjustado.toFixed(12));
    
    // Obtener decimales de ajustes para mostrar
    const decimalesAjustes = (typeof window.obtenerDecimalesAjustes === 'function') ? window.obtenerDecimalesAjustes() : 8;
    
    const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
    if (precioCTHoyAjustadoDiv) {
        precioCTHoyAjustadoDiv.textContent = valorTruncado.toFixed(decimalesAjustes);
    }
}

// Función para calcular sumatoria de Pagos Efect. Actualizados
// Solo suma los pagos de cupones anteriores al cupón vigente
function calcularSumatoriaPagosActualizados() {
    const cupones = window.cuponesModule?.getCuponesData?.() || [];
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    
    if (!fechaValuacionStr) {
        const pagosEfectActualizadosDiv = document.getElementById('pagosEfectActualizados');
        if (pagosEfectActualizadosDiv) pagosEfectActualizadosDiv.textContent = '-';
        return;
    }
    
    // Convertir fecha de valuación a Date
    let fechaValuacionDate = null;
    if (fechaValuacionStr) {
        try {
            fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        } catch (e) {
            console.error('[calcularSumatoriaPagosActualizados] Error al parsear fecha de valuación:', e);
        }
    }
    
    if (!fechaValuacionDate) {
        const pagosEfectActualizadosDiv = document.getElementById('pagosEfectActualizados');
        if (pagosEfectActualizadosDiv) pagosEfectActualizadosDiv.textContent = '-';
        return;
    }
    
    // Sumar solo los pagos actualizados de cupones con fechaLiquid < fechaValuacion
    // (no incluir cupones que liquidan en la fecha de valuación o después)
    let sumatoria = 0;
    
    cupones.forEach(cupon => {
        if (cupon.id === 'inversion') return;
        
        if (cupon.fechaLiquid) {
            try {
                const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                
                // Solo incluir cupones con fechaLiquid < fechaValuacion
                // (excluir cupones que liquidan en la fecha de valuación o después)
                if (fechaLiquidDate && fechaLiquidDate < fechaValuacionDate) {
                    const pagosActualizados = normalizarNumeroDesdeInput(cupon.pagosActualiz);
                    if (pagosActualizados !== null && isFinite(pagosActualizados)) {
                        sumatoria += pagosActualizados;
                    }
                }
            } catch (e) {
                // Continuar con el siguiente cupón si hay error
            }
        }
    });
    
    const pagosEfectActualizadosDiv = document.getElementById('pagosEfectActualizados');
    if (pagosEfectActualizadosDiv) {
        const valorTruncado = window.truncarDecimal ? window.truncarDecimal(sumatoria, 12) : parseFloat(sumatoria.toFixed(12));
        // Obtener decimales de ajustes para mostrar
        const decimalesAjustes = obtenerDecimalesAjustes();
        pagosEfectActualizadosDiv.textContent = valorTruncado.toFixed(decimalesAjustes);
    }
}

// Función para calcular Precio Ajustado - Pagos
function calcularPrecioAjustadoPagos() {
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    const precioCTHoyAjustadoDiv = document.getElementById('precioCTHoyAjustado');
    const precioCTDiv = document.getElementById('precioCT');
    const pagosEfectActualizadosDiv = document.getElementById('pagosEfectActualizados');
    
    // Para calculadoras con ajuste CER: usar Precio C+T Ajustado
    // Para calculadoras sin ajuste CER: usar Precio C+T
    const precioBaseDiv = ajusteCER ? precioCTHoyAjustadoDiv : precioCTDiv;
    
    if (!precioBaseDiv || precioBaseDiv.textContent === '-' ||
        !pagosEfectActualizadosDiv || pagosEfectActualizadosDiv.textContent === '-') {
        const precioCTAjustPagosDiv = document.getElementById('precioCTAjustPagos');
        if (precioCTAjustPagosDiv) precioCTAjustPagosDiv.textContent = '-';
        return;
    }
    
    const precioBase = parseFloat(precioBaseDiv.textContent) || 0;
    const pagosEfectActualizados = parseFloat(pagosEfectActualizadosDiv.textContent) || 0;
    
    // Precio Ajustado - Pagos = Precio Base - Pagos Efect. Actualizados
    const precioAjustadoPagos = precioBase - pagosEfectActualizados;
    const valorTruncado = window.truncarDecimal ? window.truncarDecimal(precioAjustadoPagos, 12) : parseFloat(precioAjustadoPagos.toFixed(12));
    
    // Siempre mostrar con 8 decimales (independiente del campo "Decimales")
    const precioCTAjustPagosDiv = document.getElementById('precioCTAjustPagos');
    if (precioCTAjustPagosDiv) {
        precioCTAjustPagosDiv.textContent = valorTruncado.toFixed(8);
    }
}

// Función para calcular Precio Técnico Vencimiento
function calcularPrecioTecnicoVencimiento() {
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const precioTecnicoVencimientoDiv = document.getElementById('precioTecnicoVencimiento');
    
    if (!fechaValuacionInput || !fechaValuacionInput.value) {
        if (precioTecnicoVencimientoDiv) precioTecnicoVencimientoDiv.textContent = '-';
        return;
    }
    
    // Obtener último cupón
    const cupones = window.cuponesModule?.getCuponesData?.() || [];
    const cuponesFiltrados = cupones.filter(c => c.id !== 'inversion');
    
    if (cuponesFiltrados.length === 0) {
        if (precioTecnicoVencimientoDiv) precioTecnicoVencimientoDiv.textContent = '-';
        return;
    }
    
    const ultimoCupon = cuponesFiltrados[cuponesFiltrados.length - 1];
    
    if (!ultimoCupon.fechaLiquid) {
        if (precioTecnicoVencimientoDiv) precioTecnicoVencimientoDiv.textContent = '-';
        return;
    }
    
    // Convertir fechas a formato YYYY-MM-DD
    let fechaValuacionStr = fechaValuacionInput.value;
    let fechaLiquidacionStr = ultimoCupon.fechaLiquid;
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaValuacionStr)) {
        fechaValuacionStr = convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaLiquidacionStr)) {
        fechaLiquidacionStr = convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquidacionStr);
    }
    
    // Normalizar fechas para comparación (solo fecha, sin hora)
    const fechaValuacionDate = new Date(fechaValuacionStr);
    const fechaLiquidacionDate = new Date(fechaLiquidacionStr);
    
    fechaValuacionDate.setHours(0, 0, 0, 0);
    fechaLiquidacionDate.setHours(0, 0, 0, 0);
    
    // Solo mostrar si fecha valuación = fecha liquidación último cupón
    if (fechaValuacionDate.getTime() !== fechaLiquidacionDate.getTime()) {
        if (precioTecnicoVencimientoDiv) precioTecnicoVencimientoDiv.textContent = '-';
        return;
    }
    
    // Calcular: amortización ajustada / 100 + renta ajustada / 100
    const amortizacionAjustada = normalizarNumeroDesdeInput(ultimoCupon.amortizAjustada) || 0;
    const rentaAjustada = normalizarNumeroDesdeInput(ultimoCupon.rentaAjustada) || 0;
    
    const precioTecnicoVenc = (amortizacionAjustada / 100) + (rentaAjustada / 100);
    const valorTruncado = window.truncarDecimal ? window.truncarDecimal(precioTecnicoVenc, 12) : parseFloat(precioTecnicoVenc.toFixed(12));
    
    // Siempre mostrar con 8 decimales (independiente del campo "Decimales")
    if (precioTecnicoVencimientoDiv) {
        precioTecnicoVencimientoDiv.textContent = valorTruncado.toFixed(8);
    }
}

// Función para recalcular todos los precios
function recalcularTodosPrecios() {
    calcularPrecioCT();
    calcularPrecioCTAjustado();
    calcularSumatoriaPagosActualizados();
    calcularPrecioAjustadoPagos();
    calcularPrecioTecnicoVencimiento();
}

// Exportar funciones
window.preciosModule = {
    calcularPrecioCT,
    calcularPrecioCTAjustado,
    calcularSumatoriaPagosActualizados,
    calcularPrecioAjustadoPagos,
    calcularPrecioTecnicoVencimiento,
    recalcularTodosPrecios
};

