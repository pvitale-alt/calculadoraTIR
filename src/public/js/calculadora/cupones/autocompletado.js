/**
 * Lógica de autocompletado de cupones - Primera Etapa
 * 
 * Esta primera etapa implementa:
 * - Fila de Inversión
 * - Cálculo de fechas de cupones
 * - Fechas de liquidación, fin devengamiento e inicio
 * - Consideración de días hábiles y feriados
 */

/**
 * Obtener datos del formulario
 */
function obtenerDatosFormulario() {
    return {
        fechaCompra: document.getElementById('fechaCompra')?.value || '',
        precioCompra: document.getElementById('precioCompra')?.value || '',
        cantidadPartida: document.getElementById('cantidadPartida')?.value || '',
        fechaEmision: document.getElementById('fechaEmision')?.value || '',
        fechaPrimeraRenta: document.getElementById('fechaPrimeraRenta')?.value || '',
        periodicidad: document.getElementById('periodicidad')?.value || '',
        diasRestarFechaFinDev: parseInt(document.getElementById('diasRestarFechaFinDev')?.value || '-1', 10),
        intervaloInicio: parseInt(document.getElementById('intervaloInicio')?.value || '0', 10),
        intervaloFin: parseInt(document.getElementById('intervaloFin')?.value || '0', 10),
        fechaAmortizacion: document.getElementById('fechaAmortizacion')?.value || '',
        fechaValuacion: document.getElementById('fechaValuacion')?.value || ''
    };
}

/**
 * Crear fila de inversión
 */
async function crearFilaInversion() {
    const datos = obtenerDatosFormulario();
    
    if (!datos.fechaCompra || !datos.precioCompra || !datos.cantidadPartida) {
        return null;
    }
    
    // Convertir fecha de compra a Date
    const fechaCompraDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaCompra));
    if (!fechaCompraDate) return null;
    
    // Calcular final intervalo usando días hábiles
    // Cargar feriados con margen suficiente (tanto hacia adelante como hacia atrás si intervaloFin es negativo)
    // Primero calcular aproximadamente dónde estará el finalIntervalo para cargar feriados en un rango amplio
    const fechaDesdeDate = new Date(fechaCompraDate);
    // Si intervaloFin es negativo, necesitamos más días hacia atrás
    if (datos.intervaloFin < 0) {
        fechaDesdeDate.setDate(fechaDesdeDate.getDate() + datos.intervaloFin - 60); // 60 días antes del final estimado
    } else {
        fechaDesdeDate.setDate(fechaDesdeDate.getDate() - 30); // 30 días antes de la fecha compra
    }
    const fechaDesde = formatearFechaInput(fechaDesdeDate);
    
    const fechaHastaDate = new Date(fechaCompraDate);
    if (datos.intervaloFin < 0) {
        fechaHastaDate.setDate(fechaHastaDate.getDate() + 30); // 30 días después de la fecha compra
    } else {
        fechaHastaDate.setDate(fechaHastaDate.getDate() + datos.intervaloFin + 60); // 60 días después del final estimado
    }
    const fechaHasta = formatearFechaInput(fechaHastaDate);
    
    console.log('[crearFilaInversion] Rango de fechas para feriados:', { fechaDesde, fechaHasta, intervaloFin: datos.intervaloFin });
    
    // Obtener feriados desde cache, o cargar desde BD si no hay cache
    let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
    if (!feriados || feriados.length === 0) {
        console.log('[crearFilaInversion] No hay feriados en cache, cargando desde BD...', { fechaDesde, fechaHasta });
        feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
        console.log('[crearFilaInversion] Feriados cargados desde BD:', feriados?.length || 0);
    } else {
        console.log('[crearFilaInversion] Feriados obtenidos desde cache:', feriados.length);
    }
    
    if (!feriados || feriados.length === 0) {
        console.warn('[crearFilaInversion] No se pudieron cargar feriados, usando cálculo sin feriados');
        feriados = []; // Asegurar que sea un array vacío, no null
    }
    
    // Usar fechaLiquid (que es fechaCompra) + intervaloFin con días hábiles
    const fechaLiquid = fechaCompraDate; // En la inversión, fechaLiquid = fechaCompra
    let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaLiquid, datos.intervaloFin, feriados);
    console.log('[crearFilaInversion] Cálculo finalIntervalo:', {
        fechaLiquid: formatearFechaInput(fechaLiquid),
        intervaloFin: datos.intervaloFin,
        feriadosCount: feriados.length,
        finalIntervalo: formatearFechaInput(finalIntervalo),
        feriadosEnRango: feriados.filter(f => {
            const fechaFeriado = crearFechaDesdeString(f);
            return fechaFeriado >= fechaLiquid && fechaFeriado <= finalIntervalo;
        }).length
    });
    
    // Validación: si hay fecha valuación y finalIntervalo es mayor, ajustar
    if (datos.fechaValuacion) {
        const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaValuacion));
        if (fechaValuacionDate && finalIntervalo > fechaValuacionDate) {
            // Usar fecha valuación + intervaloFin
            finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, datos.intervaloFin, feriados);
        }
    }
    
    // Cargar valores CER para obtener el valor CER Final
    const fechaDesdeCER = formatearFechaInput(finalIntervalo);
    const fechaHastaCERDate = new Date(finalIntervalo);
    fechaHastaCERDate.setDate(fechaHastaCERDate.getDate() + 30); // Margen
    const fechaHastaCER = formatearFechaInput(fechaHastaCERDate);
    // Obtener valores CER desde cache, o cargar desde BD si no hay cache
    let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesdeCER, fechaHastaCER);
    if (!valoresCER || valoresCER.length === 0) {
        valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaDesdeCER, fechaHastaCER);
    }
    const valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(finalIntervalo, valoresCER);
    
    // Calcular flujo (negativo)
    const precioCompraNum = parseFloat(datos.precioCompra.replace(',', '.')) || 0;
    const cantidadPartidaNum = parseInt(datos.cantidadPartida, 10) || 0;
    const flujo = -(precioCompraNum * cantidadPartidaNum);
    
    // Convertir fechas a formato DD/MM/AAAA para mostrar
    const fechaLiquidacionStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaCompraDate), '/');
    const finalIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(finalIntervalo), '/');
    
    // Formatear valor CER Final (4 decimales, usar punto como separador decimal)
    const valorCERFinalStr = valorCERFinal !== null ? valorCERFinal.toFixed(4) : '';
    
    return {
        id: 'inversion',
        cupon: 'Inversión',
        fechaInicio: '',
        fechaFinDev: '',
        fechaLiquid: fechaLiquidacionStr,
        inicioIntervalo: '',
        finalIntervalo: finalIntervaloStr,
        valorCERInicio: '',
        valorCERFinal: valorCERFinalStr,
        dayCountFactor: '',
        amortiz: '',
        valorResidual: '',
        amortizAjustada: '',
        rentaNominal: '',
        rentaTNA: '',
        rentaAjustada: '',
        factorActualiz: '',
        pagosActualiz: '',
        flujos: flujo.toFixed(2),
        flujosDesc: ''
    };
}

/**
 * Crear filas de cupones
 */
async function crearFilasCupones() {
    const datos = obtenerDatosFormulario();
    
    if (!datos.fechaEmision || !datos.fechaPrimeraRenta || !datos.periodicidad || !datos.fechaCompra) {
        return [];
    }
    
    // Convertir fechas a Date
    const fechaEmisionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaEmision));
    const fechaCompraDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaCompra));
    const fechaAmortizacionDate = datos.fechaAmortizacion ? 
        crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaAmortizacion)) : null;
    
    if (!fechaEmisionDate || !fechaCompraDate) {
        return [];
    }
    
    // Calcular el número del primer cupón (el siguiente a la fecha de compra)
    const numeroPrimerCupon = window.cuponesCalculoCupones.calcularNumeroPrimerCupon(
        fechaEmisionDate,
        datos.fechaPrimeraRenta,
        datos.periodicidad,
        fechaCompraDate
    );
    
    // Calcular fechas de cupones (hasta fechaAmortizacion si existe)
    const fechasCupones = window.cuponesCalculoCupones.calcularFechasCupones(
        fechaEmisionDate,
        datos.fechaPrimeraRenta,
        datos.periodicidad,
        fechaCompraDate,
        fechaAmortizacionDate
    );
    
    if (fechasCupones.length === 0) {
        return [];
    }
    
    // Calcular rango amplio de fechas para cargar feriados UNA SOLA VEZ
    // Incluir margen para intervalos (pueden ir hacia atrás o adelante)
    let fechaMinima = new Date(fechasCupones[0]);
    const fechaMaxima = new Date(fechasCupones[fechasCupones.length - 1]);
    
    // Para el primer cupón, la fecha inicio es la fecha de pago del cupón anterior
    // Necesitamos incluir esa fecha en el rango mínimo
    if (fechasCupones.length > 0) {
        // Calcular meses según periodicidad
        let mesesPorPeriodo;
        switch (datos.periodicidad.toLowerCase()) {
            case 'mensual':
                mesesPorPeriodo = 1;
                break;
            case 'bimestral':
                mesesPorPeriodo = 2;
                break;
            case 'trimestral':
                mesesPorPeriodo = 3;
                break;
            case 'semestral':
                mesesPorPeriodo = 6;
                break;
            case 'anual':
                mesesPorPeriodo = 12;
                break;
            default:
                mesesPorPeriodo = 1;
        }
        
        // Calcular fecha de pago del cupón anterior (fecha inicio del primer cupón)
        const fechaPagoPrimerCupon = fechasCupones[0];
        const fechaPagoAnterior = new Date(fechaPagoPrimerCupon);
        fechaPagoAnterior.setMonth(fechaPagoAnterior.getMonth() - mesesPorPeriodo);
        
        // Usar la fecha más antigua entre fechaPagoAnterior y fechaMinima
        if (fechaPagoAnterior < fechaMinima) {
            fechaMinima = new Date(fechaPagoAnterior);
        }
        
        // Considerar también el intervaloInicio (puede ser negativo y retroceder días)
        // El inicioIntervalo del primer cupón será: fechaPagoAnterior + intervaloInicio (en días hábiles)
        // Para asegurar que esté en el rango, restar el intervaloInicio si es negativo
        if (datos.intervaloInicio < 0) {
            // Si intervaloInicio es negativo, el inicioIntervalo será anterior a fechaPagoAnterior
            // Ajustar fechaMinima para incluir ese rango
            const diasRetroceso = Math.abs(datos.intervaloInicio) + 30; // Margen adicional
            const fechaMinimaAjustada = new Date(fechaPagoAnterior);
            fechaMinimaAjustada.setDate(fechaMinimaAjustada.getDate() - diasRetroceso);
            if (fechaMinimaAjustada < fechaMinima) {
                fechaMinima = fechaMinimaAjustada;
            }
        }
    }
    
    // Calcular márgenes considerando los intervalos
    const margenIntervalo = Math.max(
        Math.abs(datos.intervaloInicio || 0),
        Math.abs(datos.intervaloFin || 0)
    ) + 30; // Margen adicional de seguridad
    
    fechaMinima.setDate(fechaMinima.getDate() - margenIntervalo);
    fechaMaxima.setDate(fechaMaxima.getDate() + margenIntervalo);
    
    // Si hay fechaAmortizacion, incluirla en el rango
    if (fechaAmortizacionDate) {
        if (fechaAmortizacionDate < fechaMinima) {
            fechaMinima.setTime(fechaAmortizacionDate.getTime());
            fechaMinima.setDate(fechaMinima.getDate() - margenIntervalo);
        }
        if (fechaAmortizacionDate > fechaMaxima) {
            fechaMaxima.setTime(fechaAmortizacionDate.getTime());
            fechaMaxima.setDate(fechaMaxima.getDate() + margenIntervalo);
        }
    }
    
    const fechaDesde = formatearFechaInput(fechaMinima);
    const fechaHasta = formatearFechaInput(fechaMaxima);
    
    // Validar que las fechas estén en formato correcto (YYYY-MM-DD)
    if (!fechaDesde || !fechaHasta) {
        console.error('[autocompletado] Error al formatear fechas para cargar feriados');
        return [];
    }
    
    // Cargar feriados desde cache (ya deben estar cargados manualmente)
    console.log(`[autocompletado] Obteniendo feriados desde cache: ${fechaDesde} hasta ${fechaHasta}`);
    let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
    
    // Si no hay cache, cargar desde BD manualmente
    if (!feriados || feriados.length === 0) {
        console.log(`[autocompletado] Cache vacío, cargando feriados desde BD...`);
        feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
    }
    console.log(`[autocompletado] Feriados disponibles: ${feriados.length} fechas`);
    
    // Cargar valores CER desde cache (ya deben estar cargados manualmente)
    console.log(`[autocompletado] Obteniendo valores CER desde cache: ${fechaDesde} hasta ${fechaHasta}`);
    let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesde, fechaHasta);
    
    // Si no hay cache, cargar desde BD manualmente
    if (!valoresCER || valoresCER.length === 0) {
        console.log(`[autocompletado] Cache vacío, cargando valores CER desde BD...`);
        valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaDesde, fechaHasta);
    }
    console.log(`[autocompletado] Valores CER disponibles: ${valoresCER.length} registros`);
    
    // Crear filas de cupones
    const cupones = [];
    let contadorCupon = numeroPrimerCupon; // Empezar con el número correcto
    const esUltimoCupon = (index) => index === fechasCupones.length - 1;
    let fechaFinDevAnterior = null; // Guardar fecha fin dev del cupón anterior
    
    for (let i = 0; i < fechasCupones.length; i++) {
        const fechaPago = fechasCupones[i];
        const esUltimo = esUltimoCupon(i);
        const esPrimerCupon = i === 0;
        
        // Calcular fecha liquidación
        // Si es el último cupón y hay fechaAmortizacion, usar esa fecha (ajustada a día hábil)
        let fechaLiquidacion;
        if (esUltimo && fechaAmortizacionDate) {
            fechaLiquidacion = window.cuponesDiasHabiles.obtenerProximoDiaHabil(fechaAmortizacionDate, feriados);
        } else {
            // Fecha pago, si no es hábil, próximo hábil
            fechaLiquidacion = window.cuponesDiasHabiles.obtenerProximoDiaHabil(fechaPago, feriados);
        }
        
        // Calcular fecha fin devengamiento (basado en fechaPrimeraRenta + diasRestarFechaFinDev)
        const fechaFinDev = window.cuponesCalculoCupones.calcularFechaFinDev(
            fechaPago, // Usar fechaPago, no fechaLiquidacion
            datos.fechaPrimeraRenta,
            datos.periodicidad,
            datos.diasRestarFechaFinDev
        );
        
        // Calcular fecha inicio
        let fechaInicio;
        if (esPrimerCupon) {
            // Para el primer cupón (vigente en fecha de compra), la fecha inicio es la fecha de pago del cupón anterior
            // Calcular meses según periodicidad
            let mesesPorPeriodo;
            switch (datos.periodicidad.toLowerCase()) {
                case 'mensual':
                    mesesPorPeriodo = 1;
                    break;
                case 'bimestral':
                    mesesPorPeriodo = 2;
                    break;
                case 'trimestral':
                    mesesPorPeriodo = 3;
                    break;
                case 'semestral':
                    mesesPorPeriodo = 6;
                    break;
                case 'anual':
                    mesesPorPeriodo = 12;
                    break;
                default:
                    mesesPorPeriodo = 1;
            }
            
            // Calcular fecha de pago del cupón anterior
            const fechaPagoAnterior = new Date(fechaPago);
            fechaPagoAnterior.setMonth(fechaPagoAnterior.getMonth() - mesesPorPeriodo);
            
            // La fecha inicio del cupón vigente es la fecha de pago del cupón anterior
            fechaInicio = new Date(fechaPagoAnterior);
        } else {
            // Para cupones siguientes, fecha inicio = fecha fin dev del cupón anterior + 1 día corrido
            if (fechaFinDevAnterior) {
                fechaInicio = new Date(fechaFinDevAnterior);
                fechaInicio.setDate(fechaInicio.getDate() + 1); // +1 día corrido
            } else {
                // Fallback: usar fecha fin dev + 1 del cupón actual (no debería llegar aquí)
                fechaInicio = window.cuponesCalculoCupones.calcularFechaInicio(fechaFinDev);
            }
        }
        
        // Guardar fechaFinDev para el siguiente cupón
        fechaFinDevAnterior = new Date(fechaFinDev);
        
        // Calcular inicio intervalo (fecha inicio + intervaloInicio en días hábiles)
        // Usar feriados ya cargados en memoria
        let inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
            fechaInicio,
            datos.intervaloInicio,
            feriados
        );
        
        // Calcular final intervalo (fecha liquidación + intervaloFin en días hábiles)
        // Usar feriados ya cargados en memoria
        let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
            fechaLiquidacion,
            datos.intervaloFin,
            feriados
        );
        
        // Validación: si hay fecha valuación y las fechas de intervalo son mayores, ajustar
        if (datos.fechaValuacion) {
            const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaValuacion));
            if (fechaValuacionDate) {
                // Si inicioIntervalo es mayor a fecha valuación, usar fecha valuación + intervaloInicio
                if (inicioIntervalo > fechaValuacionDate) {
                    inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                        fechaValuacionDate,
                        datos.intervaloInicio,
                        feriados
                    );
                }
                
                // Si finalIntervalo es mayor a fecha valuación, usar fecha valuación + intervaloFin
                if (finalIntervalo > fechaValuacionDate) {
                    finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                        fechaValuacionDate,
                        datos.intervaloFin,
                        feriados
                    );
                }
            }
        }
        
        // Buscar valores CER para inicio y final intervalo
        // Usar valores CER ya cargados en memoria
        const valorCERInicio = window.cuponesCER.buscarValorCERPorFecha(inicioIntervalo, valoresCER);
        const valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(finalIntervalo, valoresCER);
        
        // Debug: Log para el primer cupón
        if (esPrimerCupon) {
            console.log('[autocompletado] Primer cupón - Debug:', {
                fechaInicio: formatearFechaInput(fechaInicio),
                inicioIntervalo: formatearFechaInput(inicioIntervalo),
                valorCERInicio,
                valoresCERCount: valoresCER.length,
                rangoCER: valoresCER.length > 0 ? {
                    desde: valoresCER[0].fecha,
                    hasta: valoresCER[valoresCER.length - 1].fecha
                } : null
            });
        }
        
        // Convertir fechas a formato DD/MM/AAAA para mostrar
        const fechaInicioStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaInicio), '/');
        const fechaFinDevStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaFinDev), '/');
        const fechaLiquidacionStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaLiquidacion), '/');
        const inicioIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(inicioIntervalo), '/');
        const finalIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(finalIntervalo), '/');
        
        // Formatear valores CER (4 decimales, usar punto como separador decimal para inputs HTML)
        // Los inputs HTML type="number" requieren punto, no coma
        const valorCERInicioStr = valorCERInicio !== null ? valorCERInicio.toFixed(4) : '';
        const valorCERFinalStr = valorCERFinal !== null ? valorCERFinal.toFixed(4) : '';
        
        // Calcular Day Count Factor
        // Obtener tipoInteresDias del formulario
        const tipoInteresDias = document.getElementById('tipoInteresDias')?.value || '0';
        const dayCountFactor = window.cuponesDayCountFactor?.calcularDayCountFactor(
            fechaInicio,
            fechaFinDev,
            tipoInteresDias
        );
        const dayCountFactorStr = (dayCountFactor !== null && !isNaN(dayCountFactor)) 
            ? dayCountFactor.toFixed(8) 
            : '';
        
        cupones.push({
            id: `cupon-${contadorCupon}`,
            cupon: contadorCupon,
            fechaInicio: fechaInicioStr,
            fechaFinDev: fechaFinDevStr,
            fechaLiquid: fechaLiquidacionStr,
            inicioIntervalo: inicioIntervaloStr,
            finalIntervalo: finalIntervaloStr,
            valorCERInicio: valorCERInicioStr,
            valorCERFinal: valorCERFinalStr,
            dayCountFactor: dayCountFactorStr,
            amortiz: '',
            valorResidual: '',
            amortizAjustada: '',
            rentaNominal: '',
            rentaTNA: '',
            rentaAjustada: '',
            factorActualiz: '',
            pagosActualiz: '',
            flujos: '',
            flujosDesc: ''
        });
        
        contadorCupon++;
    }
    
    return cupones;
}

/**
 * Autocompletar tabla de cupones (primera etapa)
 */
async function autocompletarCupones() {
    try {
        // Limpiar cupones existentes
        window.cuponesModule.setCuponesData([]);
        
        // Crear fila de inversión
        const filaInversion = await crearFilaInversion();
        
        // Crear filas de cupones
        const filasCupones = await crearFilasCupones();
        
        // Combinar todas las filas
        const todasLasFilas = [];
        if (filaInversion) {
            todasLasFilas.push(filaInversion);
        }
        todasLasFilas.push(...filasCupones);
        
        // Aplicar valores financieros (renta TNA y amortizaciones) antes de renderizar
        if (window.cuponesCalculos && window.cuponesCalculos.aplicarValoresFinancieros) {
            window.cuponesCalculos.aplicarValoresFinancieros(todasLasFilas);
        }
        
        // Actualizar datos y renderizar
        window.cuponesModule.setCuponesData(todasLasFilas);

        if (window.tirModule && typeof window.tirModule.resetTIR === 'function') {
            window.tirModule.resetTIR();
        }
        
        // Mostrar la tabla si hay datos
        const tablaContainer = document.getElementById('tablaCuponesContainer');
        if (tablaContainer && todasLasFilas.length > 0) {
            tablaContainer.style.display = 'block';
        }
        
        // Actualizar CER de valuación, coeficientes y visibilidad después de cargar los cupones
        setTimeout(async () => {
            console.log('[autocompletado] Actualizando CER y coeficientes después de cargar cupones');
            if (window.actualizarCERValuacion) {
                await window.actualizarCERValuacion();
            } else {
                console.warn('[autocompletado] actualizarCERValuacion no está disponible');
            }
            if (window.actualizarCoeficientesCER) {
                await window.actualizarCoeficientesCER();
            } else {
                console.warn('[autocompletado] actualizarCoeficientesCER no está disponible');
            }
            if (window.actualizarVisibilidadCoeficientesCER) {
                window.actualizarVisibilidadCoeficientesCER();
            } else {
                console.warn('[autocompletado] actualizarVisibilidadCoeficientesCER no está disponible');
            }
        }, 200);
        
    } catch (error) {
        console.error('Error al autocompletar cupones:', error);
        if (typeof showError === 'function') {
            showError('Error al autocompletar cupones: ' + error.message);
        }
    }
}

// Exportar funciones
window.autocompletarCupones = autocompletarCupones;

