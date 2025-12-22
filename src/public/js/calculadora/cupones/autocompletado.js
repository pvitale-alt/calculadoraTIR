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
        fechaPrimerPago: document.getElementById('fechaPrimerPago')?.value || '',
        fechaPrimeraRenta: document.getElementById('fechaPrimeraRenta')?.value || '',
        periodicidad: document.getElementById('periodicidad')?.value || '',
        diasRestarFechaFinDev: parseInt(document.getElementById('diasRestarFechaFinDev')?.value || '-1', 10),
        intervaloInicio: parseInt(document.getElementById('intervaloInicio')?.value || '0', 10),
        intervaloFin: parseInt(document.getElementById('intervaloFin')?.value || '0', 10),
        fechaAmortizacion: document.getElementById('fechaAmortizacion')?.value || '',
        fechaValuacion: document.getElementById('fechaValuacion')?.value || '',
        ajusteCER: document.getElementById('ajusteCER')?.checked || false
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
    
    // Obtener feriados desde cache, o cargar desde BD si no hay cache
    let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
    if (!feriados || feriados.length === 0) {
        feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
    }
    
    if (!feriados || feriados.length === 0) {
        feriados = []; // Asegurar que sea un array vacío, no null
    }
    
    // Usar fechaLiquid (que es fechaCompra) + intervaloFin con días hábiles
    const fechaLiquid = fechaCompraDate; // En la inversión, fechaLiquid = fechaCompra
    
    let finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaLiquid, datos.intervaloFin, feriados);
    
    // Validación: si hay fecha valuación y finalIntervalo es mayor, ajustar
    // SOLO para calculadoras con ajuste CER
    if (datos.ajusteCER && datos.fechaValuacion) {
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
    const fechaLiquidacionStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaLiquid), '/');
    const finalIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(finalIntervalo), '/');
    
    return {
        id: 'inversion',
        numeroCupon: '',
        fechaInicio: '',
        fechaFinDev: '',
        fechaLiquid: fechaLiquidacionStr,
        inicioIntervalo: '',
        finalIntervalo: finalIntervaloStr,
        valorCERInicio: '',
        valorCERFinal: valorCERFinal || '',
        promedioTasa: '',
        dayCountFactor: '',
        amortizacion: '',
        valorResidual: '',
        amortizacionAjustada: '',
        rentaNominal: '',
        rentaTNA: '',
        rentaAjustada: '',
        factorActualizacion: '',
        pagosActualizados: '',
        flujos: flujo,
        flujosDesc: ''
    };
}

/**
 * Construir todos los cupones del bono desde emisión hasta amortización
 * @param {Date} fechaEmisionDate - Fecha de emisión
 * @param {Date} fechaPrimerPagoDate - Fecha del primer pago
 * @param {string} periodicidad - Periodicidad
 * @param {Date} fechaAmortizacionDate - Fecha de amortización (opcional)
 * @param {string} fechaPrimeraRenta - Día de pago (1-31)
 * @returns {Array} Array de objetos con {numeroCupon, fechaPago}
 */
function construirCuponesDelBono(fechaEmisionDate, fechaPrimerPagoDate, periodicidad, fechaAmortizacionDate, fechaPrimeraRenta) {
    const normalizarFecha = (fecha) => {
        return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };
    
    // Obtener día de pago usando la función del módulo
    const obtenerDiaPago = (fechaPrimeraRenta) => {
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
    };
    
    const obtenerMesesPorPeriodo = (periodicidad) => {
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
    };
    
    const ajustarDiaAlMes = (fechaBase, diaPago) => {
        const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
        const ultimoDia = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0).getDate();
        fecha.setDate(Math.min(Math.max(1, diaPago), ultimoDia));
        return fecha;
    };
    
    // Obtener día de pago
    const diaPago = obtenerDiaPago(fechaPrimeraRenta);
    if (diaPago === null) {
        return [];
    }
    
    // Calcular meses según periodicidad
    const mesesPorPeriodo = obtenerMesesPorPeriodo(periodicidad);
    if (!mesesPorPeriodo) {
        return [];
    }
    
    const cupones = [];
    
    // Primer cupón: número 1, fecha de pago = fechaPrimerPago
    cupones.push({
        numeroCupon: 1,
        fechaPago: normalizarFecha(fechaPrimerPagoDate)
    });
    
    // Construir cupones siguientes usando periodicidad
    let fechaActual = new Date(fechaPrimerPagoDate);
    let numeroCupon = 2;
    const maxCupones = 120; // Límite de seguridad
    
    while (numeroCupon <= maxCupones) {
        // Avanzar según periodicidad
        fechaActual.setMonth(fechaActual.getMonth() + mesesPorPeriodo);
        fechaActual = ajustarDiaAlMes(fechaActual, diaPago);
        
        const fechaActualNormalizada = normalizarFecha(fechaActual);
        
        // Si hay fecha de amortización y la fecha actual es mayor, detener
        if (fechaAmortizacionDate) {
            const fechaAmortizacionNormalizada = normalizarFecha(fechaAmortizacionDate);
            if (fechaActualNormalizada > fechaAmortizacionNormalizada) {
                break;
            }
        }
        
        cupones.push({
            numeroCupon: numeroCupon,
            fechaPago: fechaActualNormalizada
        });
        
        numeroCupon++;
    }
    
    return cupones;
}

/**
 * Filtrar cupones para el cashflow basándose en fecha de compra
 * @param {Array} cuponesDelBono - Array de cupones del bono
 * @param {Date} fechaCompraDate - Fecha de compra
 * @returns {Array} Array de cupones filtrados (desde el cupón vigente en adelante)
 */
function filtrarCuponesParaCashflow(cuponesDelBono, fechaCompraDate) {
    const normalizarFecha = (fecha) => {
        return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };
    
    const fechaCompraNormalizada = normalizarFecha(fechaCompraDate);
    
    // Encontrar el cupón vigente: el primero con fechaPago >= fechaCompra
    const indiceCuponVigente = cuponesDelBono.findIndex(cupon => {
        const fechaPagoNormalizada = normalizarFecha(cupon.fechaPago);
        return fechaPagoNormalizada >= fechaCompraNormalizada;
    });
    
    if (indiceCuponVigente === -1) {
        // No se encontró cupón vigente, retornar el último cupón
        return cuponesDelBono.slice(-1);
    }
    
    // Retornar desde el cupón vigente en adelante
    return cuponesDelBono.slice(indiceCuponVigente);
}

/**
 * Crear filas de cupones
 */
async function crearFilasCupones() {
    const datos = obtenerDatosFormulario();
    
    if (!datos.fechaEmision || !datos.fechaPrimerPago || !datos.fechaPrimeraRenta || !datos.periodicidad || !datos.fechaCompra) {
        return [];
    }
    
    // Convertir fechas a Date
    const fechaEmisionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaEmision));
    const fechaPrimerPagoDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaPrimerPago));
    const fechaCompraDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaCompra));
    const fechaAmortizacionDate = datos.fechaAmortizacion ? 
        crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaAmortizacion)) : null;
    
    if (!fechaEmisionDate || !fechaPrimerPagoDate || !fechaCompraDate) {
        return [];
    }
    
    // PASO 1: Construir TODOS los cupones del bono desde emisión hasta amortización
    const cuponesDelBono = construirCuponesDelBono(
        fechaEmisionDate,
        fechaPrimerPagoDate,
        datos.periodicidad,
        fechaAmortizacionDate,
        datos.fechaPrimeraRenta
    );
    
    if (cuponesDelBono.length === 0) {
        return [];
    }
    
    // PASO 2: Filtrar cupones para el cashflow basándose en fecha de compra
    const cuponesParaCashflow = filtrarCuponesParaCashflow(cuponesDelBono, fechaCompraDate);
    
    if (cuponesParaCashflow.length === 0) {
        return [];
    }
    
    // Calcular rango amplio de fechas para cargar feriados UNA SOLA VEZ
    let fechaMinima = new Date(cuponesParaCashflow[0].fechaPago);
    let fechaMaxima = new Date(cuponesParaCashflow[cuponesParaCashflow.length - 1].fechaPago);
    
    // Incluir fecha de emisión en el rango mínimo (para el primer cupón del bono)
    if (fechaEmisionDate < fechaMinima) {
        fechaMinima = new Date(fechaEmisionDate);
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
    
    // Cargar feriados desde cache o BD
    let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
    if (!feriados || feriados.length === 0) {
        feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
    }
    
    // Cargar valores CER desde cache o BD
    let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesde, fechaHasta);
    if (!valoresCER || valoresCER.length === 0) {
        valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaDesde, fechaHasta);
    }
    
    // PASO 3: Crear objetos de cupones para el cashflow
    const cupones = [];
    const esUltimoCupon = (index) => index === cuponesParaCashflow.length - 1;
    let fechaFinDevAnterior = null; // Guardar fecha fin dev del cupón anterior
    
    // Normalizar fechas para comparación
    const normalizarFecha = (fecha) => {
        return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };
    
    // Si el primer cupón del cashflow no es el cupón número 1 del bono,
    // necesitamos calcular la fechaFinDev del cupón anterior del bono
    const esPrimerCuponCashflow = cuponesParaCashflow.length > 0;
    const primerCuponCashflow = cuponesParaCashflow[0];
    const esPrimerCuponBono = primerCuponCashflow && primerCuponCashflow.numeroCupon === 1;
    
    if (esPrimerCuponCashflow && !esPrimerCuponBono && primerCuponCashflow) {
        // Buscar el cupón anterior en cuponesDelBono
        const indiceCuponAnterior = cuponesDelBono.findIndex(c => c.numeroCupon === primerCuponCashflow.numeroCupon - 1);
        if (indiceCuponAnterior !== -1) {
            const cuponAnteriorBono = cuponesDelBono[indiceCuponAnterior];
            // Calcular fechaFinDev del cupón anterior del bono
            fechaFinDevAnterior = window.cuponesCalculoCupones.calcularFechaFinDev(
                cuponAnteriorBono.fechaPago,
                datos.fechaPrimeraRenta,
                datos.periodicidad,
                datos.diasRestarFechaFinDev
            );
        }
    }
    
    for (let i = 0; i < cuponesParaCashflow.length; i++) {
        const cuponBono = cuponesParaCashflow[i];
        const fechaPago = cuponBono.fechaPago;
        const numeroCupon = cuponBono.numeroCupon;
        const esUltimo = esUltimoCupon(i);
        const esPrimerCuponBonoActual = numeroCupon === 1; // Primer cupón del bono (número 1)
        const esPrimerCuponCashflowActual = i === 0; // Primer cupón del cashflow
        
        // Calcular fecha liquidación
        let fechaLiquidacion;
        if (esUltimo && fechaAmortizacionDate) {
            fechaLiquidacion = window.cuponesDiasHabiles.obtenerProximoDiaHabil(fechaAmortizacionDate, feriados);
        } else {
            fechaLiquidacion = window.cuponesDiasHabiles.obtenerProximoDiaHabil(fechaPago, feriados);
        }
        
        // Calcular fecha fin devengamiento
        let fechaFinDev = window.cuponesCalculoCupones.calcularFechaFinDev(
            fechaPago,
            datos.fechaPrimeraRenta,
            datos.periodicidad,
            datos.diasRestarFechaFinDev
        );
        
        // Calcular fecha inicio
        let fechaInicio;
        if (esPrimerCuponBonoActual) {
            // Solo si es el primer cupón del bono (número 1), usar fecha de emisión como fecha inicio
            fechaInicio = new Date(fechaEmisionDate);
            
            // Calcular fechaFinDev: debe ser fechaPago + diasRestarFechaFinDev, pero debe ser >= fechaInicio
            const fechaFinDevCalculada = new Date(fechaPago);
            fechaFinDevCalculada.setDate(fechaFinDevCalculada.getDate() + datos.diasRestarFechaFinDev);
            
            const fechaFinDevCalculadaNormalizada = normalizarFecha(fechaFinDevCalculada);
            const fechaInicioNormalizada = normalizarFecha(fechaInicio);
            
            if (fechaFinDevCalculadaNormalizada >= fechaInicioNormalizada) {
                fechaFinDev = fechaFinDevCalculada;
            } else {
                fechaFinDev = new Date(fechaInicio);
            }
        } else {
            // Para cupones siguientes (incluyendo el primer cupón del cashflow si no es el cupón 1 del bono)
            // fecha inicio = fecha fin dev del cupón anterior + 1 día corrido
            if (fechaFinDevAnterior) {
                fechaInicio = new Date(fechaFinDevAnterior);
                fechaInicio.setDate(fechaInicio.getDate() + 1); // +1 día corrido
            } else {
                // Fallback: calcular desde el cupón anterior del bono
                const indiceCuponAnterior = cuponesDelBono.findIndex(c => c.numeroCupon === numeroCupon - 1);
                if (indiceCuponAnterior !== -1) {
                    const cuponAnteriorBono = cuponesDelBono[indiceCuponAnterior];
                    const fechaFinDevAnteriorBono = window.cuponesCalculoCupones.calcularFechaFinDev(
                        cuponAnteriorBono.fechaPago,
                        datos.fechaPrimeraRenta,
                        datos.periodicidad,
                        datos.diasRestarFechaFinDev
                    );
                    fechaInicio = new Date(fechaFinDevAnteriorBono);
                    fechaInicio.setDate(fechaInicio.getDate() + 1); // +1 día corrido
                } else {
                    // Último fallback: usar fecha fin dev + 1 del cupón actual
                    fechaInicio = window.cuponesCalculoCupones.calcularFechaInicio(fechaFinDev);
                }
            }
        }
        
        // Guardar fechaFinDev ANTES de cualquier ajuste para el siguiente cupón
        fechaFinDevAnterior = new Date(fechaFinDev);
        
        // Calcular inicio intervalo (fecha inicio + intervaloInicio en días hábiles)
        let inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
            fechaInicio,
            datos.intervaloInicio,
            feriados
        );
        
        // Obtener fórmula seleccionada
        const formulaSelect = document.getElementById('formula');
        const formula = formulaSelect?.value || 'promedio-aritmetico';
        
        // Calcular final intervalo
        let finalIntervalo = null;
        if (formula !== 'promedio-n-tasas') {
            // IMPORTANTE: Para calculadoras CON ajuste CER, SIEMPRE usar fechaLiquidacion como base
            // Para calculadoras SIN ajuste CER, usar fechaFinDev como base
            const ajusteCER = datos.ajusteCER || false;
            const fechaBaseFinalIntervalo = ajusteCER ? fechaLiquidacion : fechaFinDev;
            
            finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                fechaBaseFinalIntervalo,
                datos.intervaloFin,
                feriados
            );
        }
        
        // Validación: si hay fecha valuación y las fechas de intervalo son mayores, ajustar
        // SOLO para calculadoras con ajuste CER y solo si no es "Promedio N tasas"
        if (datos.ajusteCER && datos.fechaValuacion && formula !== 'promedio-n-tasas') {
            const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(datos.fechaValuacion));
            if (fechaValuacionDate) {
                if (inicioIntervalo > fechaValuacionDate) {
                    inicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, datos.intervaloInicio, feriados);
                }
                if (finalIntervalo && finalIntervalo > fechaValuacionDate) {
                    finalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, datos.intervaloFin, feriados);
                }
            }
        }
        
        // Buscar valores CER para inicio y final intervalo
        const valorCERInicio = window.cuponesCER.buscarValorCERPorFecha(inicioIntervalo, valoresCER);
        const valorCERFinal = finalIntervalo ? window.cuponesCER.buscarValorCERPorFecha(finalIntervalo, valoresCER) : null;
        
        // Obtener tipoInteresDias del formulario
        const tipoInteresDias = document.getElementById('tipoInteresDias')?.value || '0';
        
        // Calcular dayCountFactor
        const dayCountFactor = window.cuponesDayCountFactor?.calcularDayCountFactor(
            fechaInicio,
            fechaFinDev,
            tipoInteresDias
        ) || null;
        
        // Convertir fechas a formato DD/MM/AAAA para mostrar
        const fechaInicioStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaInicio), '/');
        const fechaFinDevStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaFinDev), '/');
        const fechaLiquidacionStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fechaLiquidacion), '/');
        const inicioIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(inicioIntervalo), '/');
        const finalIntervaloStr = finalIntervalo ? convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(finalIntervalo), '/') : '';
        
        // Crear objeto cupón
        const cupon = {
            id: `cupon-${i + 1}`,
            numeroCupon: numeroCupon.toString(),
            fechaInicio: fechaInicioStr,
            fechaFinDev: fechaFinDevStr,
            fechaLiquid: fechaLiquidacionStr,
            inicioIntervalo: inicioIntervaloStr,
            finalIntervalo: finalIntervaloStr,
            valorCERInicio: valorCERInicio || '',
            valorCERFinal: valorCERFinal || '',
            promedioTasa: '',
            dayCountFactor: (dayCountFactor !== null && !isNaN(dayCountFactor)) ? dayCountFactor.toString() : '',
            amortizacion: '',
            valorResidual: '',
            amortizacionAjustada: '',
            rentaNominal: '',
            rentaTNA: '',
            rentaAjustada: '',
            factorActualizacion: '',
            pagosActualizados: '',
            flujos: '',
            flujosDesc: ''
        };
        
        cupones.push(cupon);
    }
    
    return cupones;
}

/**
 * Autocompletar tabla de cupones (función principal)
 */
async function autocompletarCupones() {
    try {
        // Verificar que window.cuponesModule esté disponible
        if (!window.cuponesModule) {
            console.error('[autocompletarCupones] window.cuponesModule no existe');
            throw new Error('window.cuponesModule no existe');
        }
        
        if (typeof window.cuponesModule.setCuponesData !== 'function') {
            console.error('[autocompletarCupones] setCuponesData no es una función');
            throw new Error('window.cuponesModule.setCuponesData no está definido');
        }
        
        // Validar campos obligatorios
        const camposObligatorios = [
            { id: 'ticker', nombre: 'Ticker' },
            { id: 'fechaEmision', nombre: 'Fecha Emisión' },
            { id: 'fechaPrimerPago', nombre: 'Fecha Primer Pago' },
            { id: 'fechaPrimeraRenta', nombre: 'Dia de Pago' },
            { id: 'diasRestarFechaFinDev', nombre: 'Fin Dev.' },
            { id: 'fechaAmortizacion', nombre: 'Fecha Amortización' },
            { id: 'porcentajeAmortizacion', nombre: 'Porcentaje Amortización' },
            { id: 'periodicidad', nombre: 'Periodicidad' },
            { id: 'tipoInteresDias', nombre: 'Base para contar días' },
            { id: 'fechaCompra', nombre: 'Fecha Compra' },
            { id: 'precioCompra', nombre: 'Precio Compra' },
            { id: 'cantidadPartida', nombre: 'Cantidad Partida' }
        ];
        
        const camposFaltantes = [];
        camposObligatorios.forEach(campo => {
            const elemento = document.getElementById(campo.id);
            let valor = '';
            
            if (elemento) {
                if (elemento.type === 'checkbox') {
                    valor = elemento.checked;
                } else if (elemento.tagName === 'SELECT') {
                    valor = elemento.value;
                } else {
                    valor = elemento.value?.trim() || '';
                }
                
                if (!valor || valor === '') {
                    camposFaltantes.push(campo.nombre);
                    // Resaltar campo faltante
                    elemento.style.borderColor = '#d93025';
                    elemento.style.borderWidth = '2px';
                    
                    // Quitar resaltado después de 3 segundos
                    setTimeout(() => {
                        elemento.style.borderColor = '';
                        elemento.style.borderWidth = '';
                    }, 3000);
                }
            }
        });
        
        if (camposFaltantes.length > 0) {
            const mensaje = `Por favor complete los siguientes campos: ${camposFaltantes.join(', ')}`;
            if (typeof showError === 'function') {
                showError(mensaje);
            } else {
                alert(mensaje);
            }
            return;
        }
        
        // Crear fila de inversión
        const inversion = await crearFilaInversion();
        if (!inversion) {
            console.error('[autocompletarCupones] No se pudo crear la fila de inversión');
            return;
        }
        
        // Crear filas de cupones
        const cupones = await crearFilasCupones();
        if (!cupones || cupones.length === 0) {
            if (typeof showError === 'function') {
                showError('No se pudieron generar los cupones. Verifique los datos ingresados.');
            } else {
                alert('No se pudieron generar los cupones. Verifique los datos ingresados.');
            }
            return;
        }
        
        // Combinar inversión y cupones
        const todosLosCupones = [inversion, ...cupones];
        
        // Establecer los datos en el módulo
        window.cuponesModule.setCuponesData(todosLosCupones);
        
        // Aplicar amortización desde el último cupón hacia atrás hasta completar 100%
        const porcentajeAmortizacion = document.getElementById('porcentajeAmortizacion')?.value || '';
        if (porcentajeAmortizacion && window.cuponesCalculos && typeof window.cuponesCalculos.aplicarAmortizacionEnCupones === 'function') {
            window.cuponesCalculos.aplicarAmortizacionEnCupones(todosLosCupones, porcentajeAmortizacion);
        }
        
        // Aplicar valores financieros (renta TNA, recalcular valores derivados)
        if (window.cuponesCalculos && typeof window.cuponesCalculos.aplicarValoresFinancieros === 'function') {
            window.cuponesCalculos.aplicarValoresFinancieros(todosLosCupones, {
                actualizarAmortizacion: false, // Ya se aplicó arriba
                actualizarRenta: true
            });
        }
        
        // Mostrar la tabla
        const container = document.getElementById('tablaCuponesContainer');
        if (container) {
            container.style.display = 'block';
        }
        
        // Renderizar los cupones
        if (typeof window.cuponesModule.renderizarCupones === 'function') {
            await window.cuponesModule.renderizarCupones();
        }
        
        // Actualizar coeficientes CER después de que la estructura esté completamente cargada
        const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
        if (ajusteCER) {
            // Esperar un pequeño delay para asegurar que el DOM esté completamente actualizado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (window.actualizarCERValuacion && typeof window.actualizarCERValuacion === 'function') {
                await window.actualizarCERValuacion();
            }
            
            if (window.actualizarCoeficientesCER && typeof window.actualizarCoeficientesCER === 'function') {
                await window.actualizarCoeficientesCER();
            }
        }
        
        console.log('[autocompletarCupones] Cupones creados exitosamente:', todosLosCupones.length);
        
    } catch (error) {
        console.error('[autocompletarCupones] Error:', error);
        if (typeof showError === 'function') {
            showError(`Error al autocompletar cupones: ${error.message}`);
        } else {
            alert(`Error al autocompletar cupones: ${error.message}`);
        }
    }
}

// Exportar función a window para acceso global
window.autocompletarCupones = autocompletarCupones;
