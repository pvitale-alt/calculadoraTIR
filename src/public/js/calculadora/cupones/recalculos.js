/**
 * Módulo para recálculos de cupones
 * Maneja la lógica de recálculo de campos dependientes cuando se modifican valores
 */

/**
 * Recalcula dependencias de un cupón cuando se modifica un campo
 * @param {Object} cupon - Objeto cupón
 * @param {string} campoModificado - Nombre del campo que fue modificado
 */
async function recalcularDependencias(cupon, campoModificado) {
    // Si es la fila de inversión, no tiene fechaInicio dependiente
    if (cupon.id === 'inversion') {
        // La fila de inversión solo tiene finalIntervalo dependiente de fechaLiquid
        if (campoModificado === 'fechaLiquid') {
            await recalcularFinalIntervalo(cupon);
        } else if (campoModificado === 'finalIntervalo') {
            await recalcularValorCERFinal(cupon);
        }
        return;
    }
    
    // Para cupones normales
    switch (campoModificado) {
        case 'fechaInicio':
            // fechaInicio → inicioIntervalo → valorCERInicio
            await recalcularInicioIntervalo(cupon);
            // fechaInicio → dayCountFactor
            recalcularDayCountFactor(cupon);
            break;
            
        case 'fechaFinDev':
            // fechaFinDev → dayCountFactor
            recalcularDayCountFactor(cupon);
            break;
            
        case 'fechaLiquid':
            // fechaLiquid → finalIntervalo → valorCERFinal
            await recalcularFinalIntervalo(cupon);
            break;
            
        case 'inicioIntervalo':
            // inicioIntervalo → valorCERInicio
            await recalcularValorCERInicio(cupon);
            break;
            
        case 'finalIntervalo':
            // finalIntervalo → valorCERFinal
            await recalcularValorCERFinal(cupon);
            break;
    }
}

/**
 * Recalcula inicioIntervalo basado en fechaInicio
 */
async function recalcularInicioIntervalo(cupon) {
    const fechaInicioStr = cupon.fechaInicio;
    if (!fechaInicioStr) return;
    
    try {
        // Obtener intervaloInicio del formulario
        const intervaloInicio = parseInt(document.getElementById('intervaloInicio')?.value || '0', 10);
        const fechaValuacionStr = document.getElementById('fechaValuacion')?.value || '';
        
        // Convertir fecha
        const fechaInicioDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaInicioStr));
        if (!fechaInicioDate) return;
        
        // Obtener o cargar feriados
        const fechaDesde = formatearFechaInput(fechaInicioDate);
        const fechaHastaDate = new Date(fechaInicioDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloInicio) + 60);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
        if (!feriados || feriados.length === 0) {
            feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
        }
        
        // Calcular inicioIntervalo
        let inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaInicioDate, intervaloInicio, feriados);
        
        // Validación con fecha valuación
        if (fechaValuacionStr) {
            const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
            if (fechaValuacionDate && inicioIntervalo > fechaValuacionDate) {
                inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, intervaloInicio, feriados);
            }
        }
        
        // Actualizar el valor en el cupón y en el input
        const inicioIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(inicioIntervalo), '/');
        cupon.inicioIntervalo = inicioIntervaloStr;
        
        // Actualizar input en el DOM
        const inputInicioIntervalo = document.getElementById(`inicioIntervalo_${cupon.id}`);
        if (inputInicioIntervalo) {
            inputInicioIntervalo.value = inicioIntervaloStr;
        }
        
        // Recalcular valorCERInicio
        await recalcularValorCERInicio(cupon);
        
    } catch (error) {
        console.error('Error al recalcular inicioIntervalo:', error);
    }
}

/**
 * Recalcula finalIntervalo basado en fechaLiquid
 */
async function recalcularFinalIntervalo(cupon) {
    const fechaLiquidStr = cupon.fechaLiquid;
    if (!fechaLiquidStr) return;
    
    try {
        // Obtener intervaloFin del formulario
        const intervaloFin = parseInt(document.getElementById('intervaloFin')?.value || '0', 10);
        const fechaValuacionStr = document.getElementById('fechaValuacion')?.value || '';
        
        // Convertir fecha
        const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquidStr));
        if (!fechaLiquidDate) return;
        
        // Obtener o cargar feriados
        const fechaDesde = formatearFechaInput(fechaLiquidDate);
        const fechaHastaDate = new Date(fechaLiquidDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloFin) + 60);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
        if (!feriados || feriados.length === 0) {
            feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
        }
        
        // Calcular finalIntervalo
        let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaLiquidDate, intervaloFin, feriados);
        
        // Validación con fecha valuación
        if (fechaValuacionStr) {
            const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
            if (fechaValuacionDate && finalIntervalo > fechaValuacionDate) {
                finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, intervaloFin, feriados);
            }
        }
        
        // Actualizar el valor en el cupón y en el input
        const finalIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(finalIntervalo), '/');
        cupon.finalIntervalo = finalIntervaloStr;
        
        // Actualizar input en el DOM
        const inputFinalIntervalo = document.getElementById(`finalIntervalo_${cupon.id}`);
        if (inputFinalIntervalo) {
            inputFinalIntervalo.value = finalIntervaloStr;
        }
        
        // Recalcular valorCERFinal
        await recalcularValorCERFinal(cupon);
        
        // Actualizar estilos (puede cambiar el estado futuro/no futuro)
        if (window.cuponesModule && typeof window.cuponesModule.actualizarEstilosCupones === 'function') {
            window.cuponesModule.actualizarEstilosCupones();
        }
        
    } catch (error) {
        console.error('Error al recalcular finalIntervalo:', error);
    }
}

/**
 * Recalcula valorCERInicio basado en inicioIntervalo
 */
async function recalcularValorCERInicio(cupon) {
    const inicioIntervaloStr = cupon.inicioIntervalo;
    if (!inicioIntervaloStr) return;
    
    try {
        // Convertir fecha
        const inicioIntervaloDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(inicioIntervaloStr));
        if (!inicioIntervaloDate) return;
        
        // Obtener o cargar valores CER
        const fechaCER = formatearFechaInput(inicioIntervaloDate);
        const fechaHastaDate = new Date(inicioIntervaloDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + 30);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let valoresCER = window.cuponesCER.obtenerValoresCER(fechaCER, fechaHasta);
        if (!valoresCER || valoresCER.length === 0) {
            valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaCER, fechaHasta);
        }
        
        // Buscar valor CER
        const valorCER = window.cuponesCER.buscarValorCERPorFecha(inicioIntervaloDate, valoresCER);
        const valorCERStr = valorCER !== null ? valorCER.toFixed(4) : '';
        
        // Actualizar el valor en el cupón
        cupon.valorCERInicio = valorCERStr;
        
        // Actualizar input en el DOM usando el ID
        const inputValorCER = document.getElementById(`valorCERInicio_${cupon.id}`);
        if (inputValorCER) {
            inputValorCER.value = valorCERStr;
        }
        
    } catch (error) {
        console.error('Error al recalcular valorCERInicio:', error);
    }
}

/**
 * Recalcula valorCERFinal basado en finalIntervalo
 */
async function recalcularValorCERFinal(cupon) {
    const finalIntervaloStr = cupon.finalIntervalo;
    if (!finalIntervaloStr) return;
    
    try {
        // Convertir fecha
        const finalIntervaloDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(finalIntervaloStr));
        if (!finalIntervaloDate) return;
        
        // Obtener o cargar valores CER
        const fechaCER = formatearFechaInput(finalIntervaloDate);
        const fechaHastaDate = new Date(finalIntervaloDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + 30);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let valoresCER = window.cuponesCER.obtenerValoresCER(fechaCER, fechaHasta);
        if (!valoresCER || valoresCER.length === 0) {
            valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaCER, fechaHasta);
        }
        
        // Buscar valor CER
        const valorCER = window.cuponesCER.buscarValorCERPorFecha(finalIntervaloDate, valoresCER);
        const valorCERStr = valorCER !== null ? valorCER.toFixed(4) : '';
        
        // Actualizar el valor en el cupón
        cupon.valorCERFinal = valorCERStr;
        
        // Actualizar input en el DOM usando el ID
        const inputValorCER = document.getElementById(`valorCERFinal_${cupon.id}`);
        if (inputValorCER) {
            inputValorCER.value = valorCERStr;
        }
        
    } catch (error) {
        console.error('Error al recalcular valorCERFinal:', error);
    }
}

/**
 * Recalcula dayCountFactor basado en fechaInicio y fechaFinDev
 * El intervalo es desde fechaInicio hasta fechaFinDev + 1 día corrido
 */
function recalcularDayCountFactor(cupon) {
    const fechaInicioStr = cupon.fechaInicio;
    const fechaFinDevStr = cupon.fechaFinDev;
    
    if (!fechaInicioStr || !fechaFinDevStr) {
        // Si faltan datos, limpiar el valor
        cupon.dayCountFactor = '';
        const inputDayCount = document.getElementById(`dayCountFactor_${cupon.id}`);
        if (inputDayCount) {
            inputDayCount.value = '';
        }
        return;
    }
    
    try {
        // Obtener tipoInteresDias del formulario
        const tipoInteresDias = document.getElementById('tipoInteresDias')?.value || '0';
        
        // Convertir fechas
        const fechaInicioDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaInicioStr));
        const fechaFinDevDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaFinDevStr));
        
        if (!fechaInicioDate || !fechaFinDevDate) {
            return;
        }
        
        // Calcular Day Count Factor
        // El intervalo es desde fechaInicio hasta fechaFinDev (sin sumar 1 día, ya que la función lo hace internamente)
        const dayCountFactor = window.cuponesDayCountFactor.calcularDayCountFactor(
            fechaInicioDate,
            fechaFinDevDate,
            tipoInteresDias
        );
        
        if (dayCountFactor !== null && !isNaN(dayCountFactor)) {
            // Formatear con 8 decimales (similar a Excel)
            const dayCountFactorStr = dayCountFactor.toFixed(8);
            
            // Actualizar el valor en el cupón
            cupon.dayCountFactor = dayCountFactorStr;
            
            // Actualizar input en el DOM usando el ID
            const inputDayCount = document.getElementById(`dayCountFactor_${cupon.id}`);
            if (inputDayCount) {
                inputDayCount.value = dayCountFactorStr;
            }
        } else {
            // Si no se pudo calcular, limpiar el valor
            cupon.dayCountFactor = '';
            const inputDayCount = document.getElementById(`dayCountFactor_${cupon.id}`);
            if (inputDayCount) {
                inputDayCount.value = '';
            }
        }
        
    } catch (error) {
        console.error('Error al recalcular dayCountFactor:', error);
    }
}

// Exportar funciones globalmente
window.cuponesRecalculos = {
    recalcularDependencias,
    recalcularInicioIntervalo,
    recalcularFinalIntervalo,
    recalcularValorCERInicio,
    recalcularValorCERFinal,
    recalcularDayCountFactor
};






