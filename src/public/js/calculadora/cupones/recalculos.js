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
            // fechaInicio → inicioIntervalo → valorCERInicio (o promedio TAMAR si no hay ajuste CER)
            // Esto asegura que inicioIntervalo sea consistente con fechaInicio
            await recalcularInicioIntervalo(cupon);
            // fechaInicio → dayCountFactor
            recalcularDayCountFactor(cupon);
            break;
            
        case 'fechaFinDev':
            // fechaFinDev → dayCountFactor
            recalcularDayCountFactor(cupon);
            // Si no hay ajuste CER, fechaFinDev → finalIntervalo
            // PERO solo recalcular finalIntervalo, sin disparar otros recálculos que puedan afectar fechaInicio o fechaFinDev
            const ajusteCERFinDev = document.getElementById('ajusteCER')?.checked || false;
            if (!ajusteCERFinDev && cupon.fechaFinDev) {
                // Recalcular solo finalIntervalo sin disparar recálculos adicionales
                // Esto asegura que finalIntervalo sea consistente con fechaFinDev
                await recalcularFinalIntervaloSinRecalculosAdicionales(cupon);
            }
            break;
            
        case 'fechaLiquid':
            // fechaLiquid → fechaFinDev (fechaLiquid + diasRestarFechaFinDev)
            await recalcularFechaFinDev(cupon);
            // fechaLiquid → finalIntervalo → valorCERFinal (solo si hay ajuste CER)
            const ajusteCERLiquid = document.getElementById('ajusteCER')?.checked || false;
            if (ajusteCERLiquid) {
                await recalcularFinalIntervalo(cupon);
            }
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
 * Recalcula fechaFinDev basado en fechaLiquid + diasRestarFechaFinDev
 */
async function recalcularFechaFinDev(cupon) {
    const fechaPagoStr = cupon.fechaPago || cupon.fechaLiquid;
    if (!fechaPagoStr) {
        // Si no hay fechaLiquid, limpiar fechaFinDev
        cupon.fechaFinDev = '';
        const inputFechaFinDev = document.getElementById(`fechaFinDev_${cupon.id}`);
        if (inputFechaFinDev) {
            inputFechaFinDev.value = '';
        }
        return;
    }
    
    try {
        // Obtener diasRestarFechaFinDev del formulario
        const diasRestar = parseInt(document.getElementById('diasRestarFechaFinDev')?.value || '-1', 10);
        
        // Convertir fecha de pago programada a Date
        const fechaPagoDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaPagoStr));
        if (!fechaPagoDate) return;
        
        // Calcular fechaFinDev = fechaPago + diasRestar
        const fechaFinDevDate = new Date(fechaPagoDate);
        fechaFinDevDate.setDate(fechaPagoDate.getDate() + diasRestar);
        
        // Convertir de vuelta a DD/MM/AAAA
        const fechaFinDevStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaFinDevDate), '/');
        
        // Actualizar el valor en el cupón y en el input
        cupon.fechaFinDev = fechaFinDevStr;
        const inputFechaFinDev = document.getElementById(`fechaFinDev_${cupon.id}`);
        if (inputFechaFinDev) {
            inputFechaFinDev.value = fechaFinDevStr;
        }
        
        // Recalcular dayCountFactor ya que depende de fechaFinDev
        recalcularDayCountFactor(cupon);
        
        // Si no hay ajuste CER, recalcular finalIntervalo (que depende de fechaFinDev)
        const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
        if (!ajusteCER) {
            await recalcularFinalIntervaloSinRecalculosAdicionales(cupon);
        }
        
    } catch (error) {
        console.error('Error al recalcular fechaFinDev:', error);
    }
}

/**
 * Recalcula inicioIntervalo basado en fechaInicio
 * Para calculadoras sin ajuste CER, inicioIntervalo debe ser consistente con fechaInicio
 */
async function recalcularInicioIntervalo(cupon) {
    const fechaInicioStr = cupon.fechaInicio;
    if (!fechaInicioStr) return;
    
    try {
        // Obtener intervaloInicio del formulario
        const intervaloInicio = parseInt(document.getElementById('intervaloInicio')?.value || '0', 10);
        const fechaValuacionStr = document.getElementById('fechaValuacion')?.value || '';
        const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
        
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
        
        // Calcular inicioIntervalo basado en fechaInicio
        let inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaInicioDate, intervaloInicio, feriados);
        
        // Validación con fecha valuación (solo para calculadoras con ajuste CER)
        if (ajusteCER && fechaValuacionStr) {
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
        
        // Recalcular valorCERInicio (solo si hay ajuste CER)
        if (ajusteCER) {
            await recalcularValorCERInicio(cupon);
        }
        // NOTA: El cálculo de promedio TAMAR para sin ajuste CER se hace en renderizarCupones
        // para evitar llamadas duplicadas y mejorar el rendimiento
        
    } catch (error) {
        console.error('Error al recalcular inicioIntervalo:', error);
    }
}

/**
 * Recalcula finalIntervalo basado en fechaLiquid (con ajuste CER) o fechaFinDev (sin ajuste CER)
 * Versión que solo recalcula finalIntervalo sin disparar recálculos adicionales
 * Para calculadoras sin ajuste CER, finalIntervalo debe ser consistente con fechaFinDev
 */
async function recalcularFinalIntervaloSinRecalculosAdicionales(cupon) {
    // Verificar si hay ajuste CER
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    
    // Sin ajuste CER: usar fechaFinDev
    const fechaBaseStr = ajusteCER ? cupon.fechaLiquid : cupon.fechaFinDev;
    
    if (!fechaBaseStr) return;
    
    try {
        // Obtener intervaloFin del formulario
        const intervaloFin = parseInt(document.getElementById('intervaloFin')?.value || '0', 10);
        const fechaValuacionStr = document.getElementById('fechaValuacion')?.value || '';
        
        // Convertir fecha
        const fechaBaseDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaBaseStr));
        if (!fechaBaseDate) return;
        
        // Obtener o cargar feriados
        const fechaDesde = formatearFechaInput(fechaBaseDate);
        const fechaHastaDate = new Date(fechaBaseDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloFin) + 60);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
        if (!feriados || feriados.length === 0) {
            feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
        }
        
        // Calcular finalIntervalo basado en fechaBase (fechaFinDev para no-CER, fechaLiquid para CER)
        let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaBaseDate, intervaloFin, feriados);
        
        // Validación con fecha valuación (solo para calculadoras con ajuste CER)
        if (ajusteCER && fechaValuacionStr) {
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
        
        // NOTA: El cálculo de promedio TAMAR para sin ajuste CER se hace en renderizarCupones
        // para evitar llamadas duplicadas y mejorar el rendimiento
        
    } catch (error) {
        console.error('Error al recalcular finalIntervalo:', error);
    }
}

/**
 * Recalcula finalIntervalo basado en fechaLiquid (con ajuste CER) o fechaFinDev (sin ajuste CER)
 */
async function recalcularFinalIntervalo(cupon) {
    // Verificar si hay ajuste CER
    const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
    
    // Determinar la fecha base según ajuste CER
    let fechaBaseStr = null;
    if (ajusteCER) {
        // Con ajuste CER: usar fechaLiquid
        fechaBaseStr = cupon.fechaLiquid;
    } else {
        // Sin ajuste CER: usar fechaFinDev
        fechaBaseStr = cupon.fechaFinDev;
    }
    
    if (!fechaBaseStr) return;
    
    try {
        // Obtener intervaloFin del formulario
        const intervaloFin = parseInt(document.getElementById('intervaloFin')?.value || '0', 10);
        const fechaValuacionStr = document.getElementById('fechaValuacion')?.value || '';
        
        // Convertir fecha
        const fechaBaseDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaBaseStr));
        if (!fechaBaseDate) return;
        
        // Obtener o cargar feriados
        const fechaDesde = formatearFechaInput(fechaBaseDate);
        const fechaHastaDate = new Date(fechaBaseDate);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloFin) + 60);
        const fechaHasta = formatearFechaInput(fechaHastaDate);
        
        let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
        if (!feriados || feriados.length === 0) {
            feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
        }
        
        // Calcular finalIntervalo
        let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaBaseDate, intervaloFin, feriados);
        
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
        
        // Recalcular valorCERFinal solo si hay ajuste CER
        if (ajusteCER) {
            await recalcularValorCERFinal(cupon);
        }
        // NOTA: El cálculo de promedio TAMAR para sin ajuste CER se hace en renderizarCupones
        // para evitar llamadas duplicadas y mejorar el rendimiento
        
        // NO actualizar estilos aquí para evitar recálculos que puedan afectar fechaInicio o fechaFinDev
        // Los estilos se actualizarán cuando sea necesario desde otros lugares
        
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
    recalcularFinalIntervaloSinRecalculosAdicionales,
    recalcularFechaFinDev,
    recalcularValorCERInicio,
    recalcularValorCERFinal,
    recalcularDayCountFactor
};






