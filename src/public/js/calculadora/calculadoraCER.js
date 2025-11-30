/**
 * Módulo para gestión de cálculos relacionados con CER
 * - Obtención de valores CER para fechas
 * - Actualización de CER de valuación
 * - Cálculo de coeficientes CER (Emisión y Compra)
 * - Visibilidad de coeficientes CER
 * - Refresco de tabla de cupones basado en fecha valuación
 */

/**
 * Obtener cantidad de decimales configurada para ajustes
 * @returns {number} Cantidad de decimales (default: 8)
 */
function obtenerDecimalesAjustes() {
    const input = document.getElementById('decimalesAjustes');
    if (!input) return 8; // Default: 8 decimales
    const valor = parseInt(input.value, 10);
    if (isNaN(valor) || valor < 0 || valor > 12) return 8;
    return valor;
}

/**
 * Obtener valor CER para una fecha específica (con intervaloFin)
 * @param {Date} fechaBase - Fecha base
 * @param {number} intervaloFin - Intervalo fin en días hábiles
 * @returns {Promise<number|null>} Valor CER o null si no se puede calcular
 */
async function obtenerCERParaFecha(fechaBase, intervaloFin) {
    if (!fechaBase) {
        console.warn('[obtenerCERParaFecha] fechaBase es null o undefined');
        return null;
    }
    
    try {
        console.log('[obtenerCERParaFecha] Iniciando', {
            fechaBase: formatearFechaInput(fechaBase),
            intervaloFin
        });
        
        // Calcular fecha final
        let fechaFinal = fechaBase;
        
        // Solo necesitamos feriados si intervaloFin != 0
        if (intervaloFin !== 0) {
            // Calcular fecha final (fechaBase + intervaloFin en días hábiles)
            // Usar un rango más amplio para asegurar que tengamos feriados suficientes
            const fechaDesdeDate = new Date(fechaBase);
            fechaDesdeDate.setDate(fechaDesdeDate.getDate() - 30); // 30 días antes
            const fechaDesde = formatearFechaInput(fechaDesdeDate);
            
            const fechaHastaDate = new Date(fechaBase);
            fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloFin) + 30); // Margen después
            const fechaHasta = formatearFechaInput(fechaHastaDate);
            
            console.log('[obtenerCERParaFecha] Necesitamos feriados para calcular días hábiles', { fechaDesde, fechaHasta });
            
            // Obtener feriados desde cache o cargar desde BD
            let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
            if (!feriados || feriados.length === 0) {
                console.log('[obtenerCERParaFecha] No hay feriados en cache para este rango, cargando desde BD...');
                feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
                console.log('[obtenerCERParaFecha] Feriados cargados desde BD:', feriados?.length || 0);
                
                // Intentar obtener nuevamente desde cache (ahora expandido)
                if (feriados && feriados.length > 0) {
                    feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
                }
            } else {
                console.log('[obtenerCERParaFecha] Feriados obtenidos desde cache:', feriados.length);
            }
            
            if (!feriados || feriados.length === 0) {
                console.warn('[obtenerCERParaFecha] No se pudieron cargar feriados para el rango:', { fechaDesde, fechaHasta });
                return null;
            }
            
            fechaFinal = window.cuponesDiasHabiles.sumarDiasHabiles(fechaBase, intervaloFin, feriados);
            console.log('[obtenerCERParaFecha] Fecha final calculada (con días hábiles):', formatearFechaInput(fechaFinal));
        } else {
            console.log('[obtenerCERParaFecha] intervaloFin es 0, usando fechaBase directamente');
        }
        
        // Obtener valor CER para la fecha final
        // Usar un rango amplio para asegurar que encontremos el valor
        const fechaFinalStr = formatearFechaInput(fechaFinal);
        const fechaDesdeCER = new Date(fechaFinal);
        fechaDesdeCER.setDate(fechaDesdeCER.getDate() - 30); // 30 días antes
        const fechaHastaCER = new Date(fechaFinal);
        fechaHastaCER.setDate(fechaHastaCER.getDate() + 30); // 30 días después
        
        const fechaDesdeCERStr = formatearFechaInput(fechaDesdeCER);
        const fechaHastaCERStr = formatearFechaInput(fechaHastaCER);
        
        console.log('[obtenerCERParaFecha] Buscando valores CER en rango:', { fechaDesdeCERStr, fechaHastaCERStr, fechaFinalStr });
        
        let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesdeCERStr, fechaHastaCERStr);
        if (!valoresCER || valoresCER.length === 0) {
            console.log('[obtenerCERParaFecha] No hay valores CER en cache, cargando desde BD...');
            valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaDesdeCERStr, fechaHastaCERStr);
            console.log('[obtenerCERParaFecha] Valores CER cargados desde BD:', valoresCER?.length || 0);
        } else {
            console.log('[obtenerCERParaFecha] Valores CER obtenidos desde cache:', valoresCER.length);
        }
        
        if (!valoresCER || valoresCER.length === 0) {
            console.warn('[obtenerCERParaFecha] No se pudieron cargar valores CER');
            return null;
        }
        
        const valorCER = window.cuponesCER.buscarValorCERPorFecha(fechaFinal, valoresCER);
        console.log('[obtenerCERParaFecha] Valor CER encontrado para', fechaFinalStr, ':', valorCER);
        
        return valorCER;
    } catch (error) {
        console.error('[obtenerCERParaFecha] Error:', error);
        return null;
    }
}

/**
 * Actualizar el valor CER de valuación mostrado en el input
 */
async function actualizarCERValuacion() {
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const intervaloFinInput = document.getElementById('intervaloFin');
    const cerValuacionInput = document.getElementById('cerValuacion');
    
    if (!fechaValuacionInput || !intervaloFinInput || !cerValuacionInput) {
        return;
    }
    
    const fechaValuacionStr = fechaValuacionInput.value;
    const intervaloFin = parseInt(intervaloFinInput.value || '0', 10);
    
    if (!fechaValuacionStr) {
        cerValuacionInput.value = '';
        return;
    }
    
    try {
        // Convertir fecha valuación a Date
        const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        if (!fechaValuacionDate) {
            cerValuacionInput.value = '';
            return;
        }
        
        // Calcular fecha final (fechaValuacion + intervaloFin en días hábiles)
        // Los feriados solo se necesitan si intervaloFin != 0 para calcular días hábiles
        let fechaFinal = fechaValuacionDate;
        
        if (intervaloFin !== 0) {
            // Necesitamos feriados para calcular días hábiles
            // Incluir días hacia atrás si intervaloFin es negativo
            const fechaDesdeDate = new Date(fechaValuacionDate);
            fechaDesdeDate.setDate(fechaDesdeDate.getDate() - Math.abs(intervaloFin) - 30);
            const fechaDesde = formatearFechaInput(fechaDesdeDate);
            
            const fechaHastaDate = new Date(fechaValuacionDate);
            fechaHastaDate.setDate(fechaHastaDate.getDate() + Math.abs(intervaloFin) + 30);
            const fechaHasta = formatearFechaInput(fechaHastaDate);
            
            console.log('[actualizarCERValuacion] Rango de fechas para feriados:', { fechaDesde, fechaHasta, intervaloFin });
            
            // Intentar obtener feriados desde cache, o cargar desde BD si no hay
            let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
            if (!feriados || feriados.length === 0) {
                console.log('[actualizarCERValuacion] No hay feriados en cache, cargando desde BD...');
                feriados = await window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
                console.log('[actualizarCERValuacion] Feriados cargados desde BD:', feriados?.length || 0);
            } else {
                console.log('[actualizarCERValuacion] Feriados obtenidos desde cache:', feriados.length);
            }
            
            // Si no hay feriados, usar días corridos (feriados = [])
            if (!feriados || feriados.length === 0) {
                console.warn('[actualizarCERValuacion] No se pudieron cargar feriados, usando días corridos');
                feriados = [];
            }
            
            fechaFinal = window.cuponesDiasHabiles.sumarDiasHabiles(fechaValuacionDate, intervaloFin, feriados);
            console.log('[actualizarCERValuacion] Fecha final calculada:', formatearFechaInput(fechaFinal));
        }
        
        // Obtener valor CER para la fecha final
        // Usar un rango amplio para asegurar que encontremos el valor
        const fechaFinalStr = formatearFechaInput(fechaFinal);
        const fechaDesdeCER = new Date(fechaFinal);
        fechaDesdeCER.setDate(fechaDesdeCER.getDate() - 30); // 30 días antes
        const fechaHastaCER = new Date(fechaFinal);
        fechaHastaCER.setDate(fechaHastaCER.getDate() + 30); // 30 días después
        
        const fechaDesdeCERStr = formatearFechaInput(fechaDesdeCER);
        const fechaHastaCERStr = formatearFechaInput(fechaHastaCER);
        
        // Intentar obtener valores CER desde cache, o cargar desde BD si no hay
        let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesdeCERStr, fechaHastaCERStr);
        if (!valoresCER || valoresCER.length === 0) {
            console.log('[actualizarCERValuacion] No hay valores CER en cache, cargando desde BD...', { fechaDesdeCERStr, fechaHastaCERStr });
            valoresCER = await window.cuponesCER.cargarValoresCERDesdeBD(fechaDesdeCERStr, fechaHastaCERStr);
            console.log('[actualizarCERValuacion] Valores CER cargados desde BD:', valoresCER?.length || 0);
        } else {
            console.log('[actualizarCERValuacion] Valores CER obtenidos desde cache:', valoresCER.length);
        }
        
        if (!valoresCER || valoresCER.length === 0) {
            console.warn('[actualizarCERValuacion] No se pudieron cargar valores CER');
            cerValuacionInput.value = 'N/A (cargar CER)';
            return;
        }
        
        const valorCER = window.cuponesCER.buscarValorCERPorFecha(fechaFinal, valoresCER);
        console.log('[actualizarCERValuacion] Valor CER encontrado:', valorCER, 'para fecha:', formatearFechaInput(fechaFinal));
        
        // Mostrar valor CER
        if (valorCER !== null) {
            cerValuacionInput.value = valorCER.toFixed(4);
        } else {
            console.warn('[actualizarCERValuacion] No se encontró valor CER para fecha:', formatearFechaInput(fechaFinal));
            cerValuacionInput.value = 'N/A';
        }
    } catch (error) {
        console.error('Error al calcular CER de valuación:', error);
        cerValuacionInput.value = 'Error';
    }
}

/**
 * Actualizar visibilidad de los coeficientes CER y paneles según tipo de calculadora
 * - Panel CER Valuación: solo si hay cupones Y ajusteCER está activado
 * - Panel Decimales Renta TNA: solo si hay cupones Y ajusteCER NO está activado
 * - Coeficientes CER: solo si hay cupones Y ajusteCER está activado
 */
function actualizarVisibilidadCoeficientesCER() {
    const coeficientesContainer = document.getElementById('coeficientesCERContainer');
    const panelCERValuacion = document.getElementById('panelCERValuacion');
    const panelDecimalesRentaTNA = document.getElementById('panelDecimalesRentaTNA');
    const ajusteCERCheckbox = document.getElementById('ajusteCER');
    
    if (!ajusteCERCheckbox) {
        return;
    }
    
    // Verificar si hay cupones cargados
    const tieneCupones = window.cuponesModule && 
                         window.cuponesModule.getCuponesData && 
                         window.cuponesModule.getCuponesData().length > 0;
    
    // Verificar si ajusteCER está activado
    const ajusteCERActivo = ajusteCERCheckbox.checked;
    
    // Panel Coeficientes CER: solo si hay cupones Y ajusteCER activado
    if (coeficientesContainer) {
        if (tieneCupones && ajusteCERActivo) {
            coeficientesContainer.style.display = 'flex';
        } else {
            coeficientesContainer.style.display = 'none';
        }
    }
    
    // Panel CER Valuación: solo si hay cupones Y ajusteCER activado
    if (panelCERValuacion) {
        if (tieneCupones && ajusteCERActivo) {
            panelCERValuacion.style.display = 'flex';
        } else {
            panelCERValuacion.style.display = 'none';
        }
    }
    
    // Panel Decimales Renta TNA: solo si hay cupones Y ajusteCER NO activado
    if (panelDecimalesRentaTNA) {
        if (tieneCupones && !ajusteCERActivo) {
            panelDecimalesRentaTNA.style.display = 'flex';
        } else {
            panelDecimalesRentaTNA.style.display = 'none';
        }
    }
}

/**
 * Actualizar coeficientes CER (Emisión y Compra)
 */
async function actualizarCoeficientesCER() {
    console.log('[actualizarCoeficientesCER] Iniciando actualización de coeficientes CER');
    
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaEmisionInput = document.getElementById('fechaEmision');
    const fechaCompraInput = document.getElementById('fechaCompra');
    const intervaloFinInput = document.getElementById('intervaloFin');
    const coefCEREmisionSpan = document.getElementById('coefCEREmision');
    const coefCERCompraSpan = document.getElementById('coefCERCompra');
    const cerEmisionValorSpan = document.getElementById('valorCEREmision');
    const cerCompraValorSpan = document.getElementById('valorCERCompra');
    
    if (!fechaValuacionInput || !intervaloFinInput || !coefCEREmisionSpan || !coefCERCompraSpan) {
        console.warn('[actualizarCoeficientesCER] Faltan elementos del DOM:', {
            fechaValuacionInput: !!fechaValuacionInput,
            intervaloFinInput: !!intervaloFinInput,
            coefCEREmisionSpan: !!coefCEREmisionSpan,
            coefCERCompraSpan: !!coefCERCompraSpan
        });
        return;
    }
    
    const fechaValuacionStr = fechaValuacionInput.value;
    
    // Asegurar que fechaEmisionStr sea un string válido
    // Convertir a string si es necesario (por si acaso hay algún objeto o valor no string)
    let fechaEmisionStr = '';
    if (fechaEmisionInput) {
        const valor = fechaEmisionInput.value;
        if (valor !== null && valor !== undefined) {
            if (typeof valor === 'string') {
                fechaEmisionStr = valor;
            } else if (typeof valor === 'object') {
                // Si es un objeto, intentar obtener el valor de alguna propiedad común
                console.warn('[actualizarCoeficientesCER] fechaEmisionInput.value es un objeto:', valor);
                fechaEmisionStr = String(valor);
            } else {
                fechaEmisionStr = String(valor);
            }
        }
    }
    
    // Asegurar que fechaCompraStr sea un string válido
    let fechaCompraStr = '';
    if (fechaCompraInput) {
        const valor = fechaCompraInput.value;
        if (valor !== null && valor !== undefined) {
            if (typeof valor === 'string') {
                fechaCompraStr = valor;
            } else {
                fechaCompraStr = String(valor);
            }
        }
    }
    
    const intervaloFin = parseInt(intervaloFinInput.value || '0', 10);
    
    // Resetear valores
    coefCEREmisionSpan.textContent = '-';
    coefCERCompraSpan.textContent = '-';
    if (cerEmisionValorSpan) {
        cerEmisionValorSpan.textContent = '-';
    }
    if (cerCompraValorSpan) {
        cerCompraValorSpan.textContent = '-';
    }
    
    if (!fechaValuacionStr) {
        return;
    }
    
    try {
        let cerEmision = null;
        let cerCompra = null;
        
        // Convertir fechas a Date
        const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        if (!fechaValuacionDate) {
            return;
        }
        
        // Obtener CER de valuación
        console.log('[actualizarCoeficientesCER] Obteniendo CER de valuación...', { fechaValuacionStr, intervaloFin });
        const cerValuacion = await obtenerCERParaFecha(fechaValuacionDate, intervaloFin);
        console.log('[actualizarCoeficientesCER] CER de valuación obtenido:', cerValuacion);
        
        if (cerValuacion === null || cerValuacion === 0) {
            console.warn('[actualizarCoeficientesCER] No se pudo obtener CER de valuación');
            coefCEREmisionSpan.textContent = 'N/A';
            coefCERCompraSpan.textContent = 'N/A';
            return;
        }
        
        // Calcular Coeficiente CER Emisión
        console.log('[actualizarCoeficientesCER] Iniciando cálculo de Coef. CER Emisión', {
            fechaEmisionStr,
            fechaEmisionStrLength: fechaEmisionStr?.length,
            intervaloFin,
            cerValuacion
        });
        
        if (fechaEmisionStr && fechaEmisionStr.length === 10) {
            const fechaEmisionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaEmisionStr));
            console.log('[actualizarCoeficientesCER] fechaEmisionDate convertida:', fechaEmisionDate ? formatearFechaInput(fechaEmisionDate) : 'null');
            
            if (fechaEmisionDate) {
                console.log('[actualizarCoeficientesCER] Obteniendo CER para fecha emisión...');
                cerEmision = await obtenerCERParaFecha(fechaEmisionDate, intervaloFin);
                console.log('[actualizarCoeficientesCER] CER emisión obtenido:', cerEmision);
                
                if (cerEmision !== null && cerEmision !== 0) {
                    const coefEmision = cerValuacion / cerEmision;
                    console.log('[actualizarCoeficientesCER] Coeficiente calculado:', coefEmision);
                    const decimales = obtenerDecimalesAjustes();
                    coefCEREmisionSpan.textContent = coefEmision.toFixed(decimales);
                    if (cerEmisionValorSpan) {
                        cerEmisionValorSpan.textContent = cerEmision.toFixed(decimales);
                    }
                } else {
                    console.warn('[actualizarCoeficientesCER] CER emisión es null o 0:', cerEmision);
                    coefCEREmisionSpan.textContent = 'N/A';
                    if (cerEmisionValorSpan) {
                        cerEmisionValorSpan.textContent = 'N/A';
                    }
                }
            } else {
                console.warn('[actualizarCoeficientesCER] No se pudo convertir fechaEmisionStr a Date');
                coefCEREmisionSpan.textContent = 'N/A';
                if (cerEmisionValorSpan) {
                    cerEmisionValorSpan.textContent = 'N/A';
                }
            }
        } else {
            // fechaEmisionStr no es válida (no es string o no tiene 10 caracteres)
            // Solo loguear si hay un valor parcial (no loguear si está vacío, que es normal)
            if (fechaEmisionStr && fechaEmisionStr.length > 0) {
                if (typeof fechaEmisionStr !== 'string') {
                    console.warn('[actualizarCoeficientesCER] fechaEmisionStr no es un string:', {
                        type: typeof fechaEmisionStr,
                        value: fechaEmisionStr,
                        stringified: String(fechaEmisionStr)
                    });
                } else if (fechaEmisionStr.length !== 10) {
                    // Solo loguear si hay un valor parcial (usuario está escribiendo)
                    // console.log('[actualizarCoeficientesCER] fechaEmisionStr incompleta:', fechaEmisionStr.length);
                }
            }
            // No mostrar N/A si el campo está vacío, solo mostrar el guión
            coefCEREmisionSpan.textContent = fechaEmisionStr && fechaEmisionStr.length > 0 ? 'N/A' : '-';
            if (cerEmisionValorSpan) {
                cerEmisionValorSpan.textContent = fechaEmisionStr && fechaEmisionStr.length > 0 ? 'N/A' : '-';
            }
        }
        
        // Calcular Coeficiente CER Compra
        if (fechaCompraStr && fechaCompraStr.length === 10) {
            const fechaCompraDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaCompraStr));
            if (fechaCompraDate) {
                cerCompra = await obtenerCERParaFecha(fechaCompraDate, intervaloFin);
                if (cerCompra !== null && cerCompra !== 0) {
                    const coefCompra = cerValuacion / cerCompra;
                    const decimales = obtenerDecimalesAjustes();
                    coefCERCompraSpan.textContent = coefCompra.toFixed(decimales);
                    if (cerCompraValorSpan) {
                        cerCompraValorSpan.textContent = cerCompra.toFixed(decimales);
                    }
                } else {
                    coefCERCompraSpan.textContent = 'N/A';
                    if (cerCompraValorSpan) {
                        cerCompraValorSpan.textContent = 'N/A';
                    }
                }
            } else {
                coefCERCompraSpan.textContent = 'N/A';
                if (cerCompraValorSpan) {
                    cerCompraValorSpan.textContent = 'N/A';
                }
            }
        } else {
            coefCERCompraSpan.textContent = 'N/A';
            if (cerCompraValorSpan) {
                cerCompraValorSpan.textContent = 'N/A';
            }
        }
        
        window.cerValoresReferencia = {
            cerValuacion,
            cerEmision,
            cerCompra
        };
        
        if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados && window.cuponesModule && window.cuponesModule.getCuponesData) {
            window.cuponesCalculos.recalcularValoresDerivados(window.cuponesModule.getCuponesData());
        }
    } catch (error) {
        console.error('Error al calcular coeficientes CER:', error);
        coefCEREmisionSpan.textContent = 'Error';
        coefCERCompraSpan.textContent = 'Error';
    }
}

/**
 * Refrescar la tabla cuando cambia la fecha valuación
 * Actualiza estilos Y recalcula intervalos/valores CER para cupones futuros
 */
async function refrescarTablaCupones() {
    // Verificar si hay cupones cargados
    const tablaContainer = document.getElementById('tablaCuponesContainer');
    const tieneCupones = tablaContainer && tablaContainer.style.display !== 'none' && 
                        window.cuponesModule && window.cuponesModule.getCuponesData().length > 0;
    
    if (!tieneCupones) {
        return;
    }
    
    // Obtener fecha valuación e intervaloFin
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const intervaloFinInput = document.getElementById('intervaloFin');
    const intervaloInicioInput = document.getElementById('intervaloInicio');
    
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    const intervaloFin = parseInt(intervaloFinInput?.value || '0', 10);
    const intervaloInicio = parseInt(intervaloInicioInput?.value || '0', 10);
    
    if (!fechaValuacionStr) {
        return;
    }
    
    const fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
    if (!fechaValuacionDate) {
        return;
    }
    
    // Obtener feriados y valores CER desde cache o cargar desde BD
    // Necesitamos cubrir tanto offsets negativos como positivos de los intervalos
    const menorOffset = Math.min(0, intervaloInicio, intervaloFin);
    const mayorOffset = Math.max(0, intervaloInicio, intervaloFin);
    
    const fechaDesdeDate = new Date(fechaValuacionDate);
    fechaDesdeDate.setDate(fechaDesdeDate.getDate() + menorOffset - 30); // margen extra hacia atrás
    const fechaHastaDate = new Date(fechaValuacionDate);
    fechaHastaDate.setDate(fechaHastaDate.getDate() + mayorOffset + 30); // margen extra hacia adelante
    
    const fechaDesde = formatearFechaInput(fechaDesdeDate);
    const fechaHasta = formatearFechaInput(fechaHastaDate);
    
    let feriados = window.cuponesDiasHabiles.obtenerFeriados(fechaDesde, fechaHasta);
    let valoresCER = window.cuponesCER.obtenerValoresCER(fechaDesde, fechaHasta);
    
    const necesitaFeriados = !feriados || feriados.length === 0;
    const necesitaCER = !valoresCER || valoresCER.length === 0;
    
    if (necesitaFeriados || necesitaCER) {
        const [feriadosCargados, valoresCERCargados] = await Promise.all([
            necesitaFeriados ? window.cuponesDiasHabiles.cargarFeriadosDesdeBD(fechaDesde, fechaHasta) : Promise.resolve(null),
            necesitaCER ? window.cuponesCER.cargarValoresCERDesdeBD(fechaDesde, fechaHasta) : Promise.resolve(null)
        ]);
        
        if (necesitaFeriados && feriadosCargados) {
            feriados = feriadosCargados;
        }
        if (necesitaCER && valoresCERCargados) {
            valoresCER = valoresCERCargados;
        }
    }
    
    // Si no hay datos después de intentar cargar, solo actualizar estilos
    if ((!feriados || feriados.length === 0) && (!valoresCER || valoresCER.length === 0)) {
        // Solo actualizar estilos
        if (window.cuponesModule && typeof window.cuponesModule.actualizarEstilosCupones === 'function') {
            window.cuponesModule.actualizarEstilosCupones();
        }
        return;
    }
    
    // Obtener cupones y actualizar los que tienen fechas mayores a fecha valuación
    const cuponesData = window.cuponesModule.getCuponesData();
    let huboCambios = false;
    let huboCambiosInversion = false;
    
    for (const cupon of cuponesData) {
        // Actualizar finalIntervalo de inversión siempre cuando cambia fecha valuación
        if (cupon.id === 'inversion') {
            // Para la inversión, recalcular finalIntervalo = fechaLiquid + intervaloFin
            // Pero si fechaLiquid > fechaValuacion, usar fechaValuacion + intervaloFin
            if (cupon.fechaLiquid) {
                try {
                    const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                    
                    if (fechaLiquidDate) {
                        let fechaBase = fechaLiquidDate;
                        
                        // Si fechaLiquid > fechaValuacion, usar fechaValuacion como base
                        if (fechaLiquidDate > fechaValuacionDate) {
                            fechaBase = fechaValuacionDate;
                        }
                        
                        // Recalcular finalIntervalo usando días hábiles (siempre, incluso sin feriados)
                        const feriadosParaCalcular = feriados || [];
                        const nuevoFinalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                            fechaBase,
                            intervaloFin,
                            feriadosParaCalcular
                        );
                        const nuevoFinalIntervaloStr = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(nuevoFinalIntervalo), '/');
                        
                        // Actualizar siempre (puede cambiar aunque la fecha base no cambie, por los feriados)
                        const valorAnterior = cupon.finalIntervalo;
                        cupon.finalIntervalo = nuevoFinalIntervaloStr;
                        if (valorAnterior !== nuevoFinalIntervaloStr) {
                            huboCambiosInversion = true;
                        }
                        
                        // Buscar valor CER para nuevo final intervalo
                        let valorCERFinal = null;
                        if (valoresCER && valoresCER.length > 0) {
                            valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(nuevoFinalIntervalo, valoresCER);
                        } else {
                            // Si no hay valores CER en cache, intentar cargar
                            const fechaCERDesde = formatearFechaInput(nuevoFinalIntervalo);
                            const fechaCERHastaDate = new Date(nuevoFinalIntervalo);
                            fechaCERHastaDate.setDate(fechaCERHastaDate.getDate() + 30);
                            const fechaCERHasta = formatearFechaInput(fechaCERHastaDate);
                            
                            const valoresCERInversion = await window.cuponesCER.cargarValoresCERDesdeBD(fechaCERDesde, fechaCERHasta);
                            if (valoresCERInversion && valoresCERInversion.length > 0) {
                                valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(nuevoFinalIntervalo, valoresCERInversion);
                            }
                        }
                        
                        const valorCERFinalStr = valorCERFinal !== null ? valorCERFinal.toFixed(4) : '';
                        const valorCERAnterior = cupon.valorCERFinal;
                        cupon.valorCERFinal = valorCERFinalStr;
                        if (valorCERAnterior !== valorCERFinalStr) {
                            huboCambiosInversion = true;
                        }
                    }
                } catch (e) {
                    console.error('Error al procesar inversión:', e);
                }
            }
            continue;
        }
        
        // Verificar si fechaLiquid es mayor a fechaValuacion
        if (cupon.fechaLiquid) {
            try {
                const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                
                if (fechaLiquidDate && fechaLiquidDate > fechaValuacionDate) {
                    // Es un cupón futuro - recalcular intervalos usando fecha valuación
                    const feriadosParaCalcular = feriados || [];
                    
                    // Recalcular inicioIntervalo = fechaValuacion + intervaloInicio
                    const nuevoInicioIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                        fechaValuacionDate,
                        intervaloInicio,
                        feriadosParaCalcular
                    );
                    cupon.inicioIntervalo = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(nuevoInicioIntervalo), '/');
                    
                    // Buscar valor CER para nuevo inicio intervalo
                    if (valoresCER && valoresCER.length > 0) {
                        const valorCERInicio = window.cuponesCER.buscarValorCERPorFecha(nuevoInicioIntervalo, valoresCER);
                        cupon.valorCERInicio = valorCERInicio !== null ? valorCERInicio.toFixed(4) : '';
                    } else {
                        // Si no hay valores CER en cache, intentar cargar
                        const fechaCERDesde = formatearFechaInput(nuevoInicioIntervalo);
                        const fechaCERHastaDate = new Date(nuevoInicioIntervalo);
                        fechaCERHastaDate.setDate(fechaCERHastaDate.getDate() + 30);
                        const fechaCERHasta = formatearFechaInput(fechaCERHastaDate);
                        
                        const valoresCERInicio = await window.cuponesCER.cargarValoresCERDesdeBD(fechaCERDesde, fechaCERHasta);
                        if (valoresCERInicio && valoresCERInicio.length > 0) {
                            const valorCERInicio = window.cuponesCER.buscarValorCERPorFecha(nuevoInicioIntervalo, valoresCERInicio);
                            cupon.valorCERInicio = valorCERInicio !== null ? valorCERInicio.toFixed(4) : '';
                        }
                    }
                    
                    // Recalcular finalIntervalo = fechaValuacion + intervaloFin
                    const nuevoFinalIntervalo = window.cuponesDiasHabiles.sumarDiasHabiles(
                        fechaValuacionDate,
                        intervaloFin,
                        feriadosParaCalcular
                    );
                    cupon.finalIntervalo = convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(nuevoFinalIntervalo), '/');
                    
                    // Buscar valor CER para nuevo final intervalo
                    if (valoresCER && valoresCER.length > 0) {
                        const valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(nuevoFinalIntervalo, valoresCER);
                        cupon.valorCERFinal = valorCERFinal !== null ? valorCERFinal.toFixed(4) : '';
                    } else {
                        // Si no hay valores CER en cache, intentar cargar
                        const fechaCERDesde = formatearFechaInput(nuevoFinalIntervalo);
                        const fechaCERHastaDate = new Date(nuevoFinalIntervalo);
                        fechaCERHastaDate.setDate(fechaCERHastaDate.getDate() + 30);
                        const fechaCERHasta = formatearFechaInput(fechaCERHastaDate);
                        
                        const valoresCERFinal = await window.cuponesCER.cargarValoresCERDesdeBD(fechaCERDesde, fechaCERHasta);
                        if (valoresCERFinal && valoresCERFinal.length > 0) {
                            const valorCERFinal = window.cuponesCER.buscarValorCERPorFecha(nuevoFinalIntervalo, valoresCERFinal);
                            cupon.valorCERFinal = valorCERFinal !== null ? valorCERFinal.toFixed(4) : '';
                        }
                    }
                    
                    huboCambios = true;
                }
            } catch (e) {
                console.error('Error al procesar cupón:', e);
            }
        }
    }
    
    // Si hubo cambios (en inversión o en cupones), actualizar y re-renderizar
    if (huboCambios || huboCambiosInversion) {
        window.cuponesModule.setCuponesData(cuponesData);
    } else {
        // Solo actualizar estilos si no hubo cambios en los datos
        if (window.cuponesModule && typeof window.cuponesModule.actualizarEstilosCupones === 'function') {
            window.cuponesModule.actualizarEstilosCupones();
        }
    }
}

/**
 * Actualizar decimales de ajustes y refrescar toda la tabla
 * Esta función se llama cuando el usuario cambia el valor de decimales
 */
async function actualizarDecimalesAjustes() {
    console.log('[actualizarDecimalesAjustes] Actualizando decimales y refrescando tabla');
    
    // Recalcular coeficientes CER con los nuevos decimales
    await actualizarCoeficientesCER();
    
    // Recalcular todos los valores derivados (amortización ajustada, renta ajustada) con los nuevos decimales
    if (window.cuponesModule && window.cuponesModule.getCuponesData) {
        const cupones = window.cuponesModule.getCuponesData();
        if (cupones && cupones.length > 0) {
            if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados) {
                window.cuponesCalculos.recalcularValoresDerivados(cupones);
            }
        }
    }
    
    // Refrescar la tabla para mostrar los valores actualizados
    if (window.cuponesModule && typeof window.cuponesModule.renderizarCupones === 'function') {
        window.cuponesModule.renderizarCupones();
    }
}

// Exportar funciones globalmente
window.calculadoraCER = {
    obtenerCERParaFecha,
    actualizarCERValuacion,
    actualizarCoeficientesCER,
    actualizarVisibilidadCoeficientesCER,
    refrescarTablaCupones,
    actualizarDecimalesAjustes,
    obtenerDecimalesAjustes
};

// Exportar función globalmente para acceso desde HTML
window.actualizarDecimalesAjustes = actualizarDecimalesAjustes;
window.obtenerDecimalesAjustes = obtenerDecimalesAjustes;

// Mantener compatibilidad con código existente
window.obtenerCERParaFecha = obtenerCERParaFecha;
window.actualizarCERValuacion = actualizarCERValuacion;
window.actualizarCoeficientesCER = actualizarCoeficientesCER;
window.actualizarVisibilidadCoeficientesCER = actualizarVisibilidadCoeficientesCER;
window.refrescarTablaCupones = refrescarTablaCupones;

