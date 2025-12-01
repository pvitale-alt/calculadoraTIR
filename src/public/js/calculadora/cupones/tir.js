/**
 * Módulo de TIR para la calculadora TIR.
 * Replica la lógica de @Calculadora para resolver la tasa y flujos descontados.
 */

let ultimaTIRCalculada = null;

function obtenerFechaCompraISO() {
    const fechaCompraInput = document.getElementById('fechaCompra');
    const fechaCompra = fechaCompraInput?.value?.trim();
    if (!fechaCompra) {
        return null;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaCompra)) {
        return convertirFechaDDMMAAAAaYYYYMMDD(fechaCompra);
    }
    return fechaCompra;
}

function recolectarFlujosYFechas() {
    const datos = window.cuponesModule?.getCuponesData?.() || [];
    const items = [];

    console.log('📊 [recolectarFlujosYFechas] Recolectando flujos y fechas...');
    console.log('📊 [recolectarFlujosYFechas] Total cupones:', datos.length);

    datos.forEach((cupon, index) => {
        if (!cupon.fechaLiquid) {
            console.log(`  ⚠️ Cupón ${index} (${cupon.id}): Sin fecha liquidación`);
            return;
        }

        // PRIORIDAD: Usar el valor del input (lo que el usuario ve y puede haber modificado)
        // Si el input está vacío o es inválido, usar flujosNumero como respaldo
        const flujoRaw = cupon.flujos;
        let flujo = null;
        
        // Primero intentar leer del input (lo que el usuario ve)
        const flujoDesdeInput = normalizarNumeroDesdeInput(flujoRaw);
        
        if (flujoDesdeInput !== null && isFinite(flujoDesdeInput)) {
            // Usar el valor del input (puede haber sido modificado manualmente)
            flujo = flujoDesdeInput;
            // Actualizar flujosNumero para mantener consistencia
            cupon.flujosNumero = flujo;
            console.log(`  ✅ Cupón ${index} (${cupon.id}): Usando flujo desde input (valor visible)`, {
                flujoRaw: flujoRaw,
                flujoDesdeInput: flujoDesdeInput,
                flujo: flujo
            });
        } else if (cupon.flujosNumero !== undefined && cupon.flujosNumero !== null) {
            // Si el input no es válido, usar flujosNumero como respaldo
            flujo = cupon.flujosNumero;
            console.log(`  ⚠️ Cupón ${index} (${cupon.id}): Input inválido, usando flujosNumero como respaldo`, {
                flujoRaw: flujoRaw,
                flujosNumero: cupon.flujosNumero,
                flujo: flujo
            });
        } else {
            console.log(`  ⚠️ Cupón ${index} (${cupon.id}): Flujo nulo o inválido (raw: "${flujoRaw}")`);
            return;
        }

        let fechaLiquid = cupon.fechaLiquid;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaLiquid)) {
            fechaLiquid = convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquid);
        }

        const flujoNumber = Number(flujo);
        const flujoString = flujoNumber.toString();
        const decimales = flujoString.includes('.') ? flujoString.split('.')[1].length : 0;
        
        console.log(`  ✅ Cupón ${index} (${cupon.id}):`, {
            fechaLiquid: fechaLiquid,
            flujoRaw: flujoRaw,
            flujoNumber: flujoNumber,
            flujoString: flujoString,
            decimales: decimales,
            flujoCon12Decimales: flujoNumber.toFixed(12),
            flujoCon8Decimales: flujoNumber.toFixed(8)
        });

        items.push({
            flujo: flujoNumber, // Usar Number() para máxima precisión
            fecha: fechaLiquid
        });
    });

    // Ordenar por fecha (importante para el cálculo de TIR)
    items.sort((a, b) => {
        const fechaA = crearFechaDesdeString(a.fecha);
        const fechaB = crearFechaDesdeString(b.fecha);
        if (!fechaA || !fechaB) return 0;
        return fechaA.getTime() - fechaB.getTime();
    });

    // Separar flujos y fechas ordenados
    const flujos = items.map(item => item.flujo);
    const fechas = items.map(item => item.fecha);

    console.log('📊 [recolectarFlujosYFechas] Resumen:', {
        totalFlujos: flujos.length,
        flujos: flujos.map((f, i) => ({
            index: i,
            fecha: fechas[i],
            flujo: f,
            flujoString: f.toString(),
            flujoCon12Decimales: f.toFixed(12),
            flujoCon15Decimales: f.toFixed(15),
            decimales: f.toString().includes('.') ? f.toString().split('.')[1].length : 0
        }))
    });

    return { flujos, fechas };
}

function calcularTIRLocal(flujos, fechas, fechaCompraISO) {
    // Obtener tipoInteresDias (base) para calcular fracciones de año
    const tipoInteresDias = parseInt(document.getElementById('tipoInteresDias')?.value || '0', 10);
    
    console.log('🔢 [calcularTIRLocal] Iniciando cálculo TIR');
    console.log('📊 [calcularTIRLocal] Tipo Interés Días:', tipoInteresDias);
    console.log('📊 [calcularTIRLocal] Fecha Compra:', fechaCompraISO);
    console.log('📊 [calcularTIRLocal] Total flujos:', flujos.length);
    
    // Calcular fracciones de año para todos los flujos
    const fraccionesAnio = fechas.map(fecha => calcularFraccionAnio(fechaCompraISO, fecha, tipoInteresDias));
    
    console.log('📊 [calcularTIRLocal] Flujos y fracciones de año detallados:', flujos.map((f, i) => ({
        index: i,
        fecha: fechas[i],
        flujo: f,
        flujoString: f.toString(),
        flujoCon12Decimales: f.toFixed(12),
        flujoCon15Decimales: f.toFixed(15),
        flujoCon8Decimales: f.toFixed(8),
        decimales: f.toString().includes('.') ? f.toString().split('.')[1].length : 0,
        fraccionAnio: fraccionesAnio[i],
        fraccionAnioCon12Decimales: fraccionesAnio[i].toFixed(12),
        fraccionAnioCon15Decimales: fraccionesAnio[i].toFixed(15)
    })));

    // Función para calcular la sumatoria de flujos descontados para una tasa dada
    // IMPORTANTE: Usar valores completos sin truncar para máxima precisión
    function calcularSumatoria(tasa) {
        let sumatoria = 0;
        const detalles = [];
        
        for (let i = 0; i < flujos.length; i++) {
            // Usar valores completos sin truncar
            const flujoCompleto = Number(flujos[i]);
            const fraccionAnio = calcularFraccionAnio(fechaCompraISO, fechas[i], tipoInteresDias);
            let flujoDescontado;
            
            if (fraccionAnio > 0) {
                // Calcular con máxima precisión usando Math.pow
                const factorDescuento = Math.pow(1 + tasa, fraccionAnio);
                flujoDescontado = flujoCompleto / factorDescuento;
            } else {
                flujoDescontado = flujoCompleto;
            }
            
            // Guardar detalles para logging
            detalles.push({
                index: i,
                fecha: fechas[i],
                flujoCompleto: flujoCompleto,
                fraccionAnio: fraccionAnio,
                tasa: tasa,
                factorDescuento: fraccionAnio > 0 ? Math.pow(1 + tasa, fraccionAnio) : 1,
                flujoDescontado: flujoDescontado
            });
            
            // Acumular sin truncar hasta el final
            sumatoria += flujoDescontado;
        }
        
        // Log detallado en cada iteración (solo para las primeras iteraciones o cuando tasa cambia significativamente)
        // También loguear cuando la tasa está cerca de la TIR final esperada (3.098%)
        const tasaPorcentaje = tasa * 100;
        if (Math.abs(tasa) < 0.1 || Math.abs(tasa - 0.03) < 0.001 || Math.abs(tasaPorcentaje - 3.098) < 0.01) {
            console.log(`🔍 [calcularSumatoria] Tasa=${tasaPorcentaje.toFixed(8)}%:`, {
                sumatoria: sumatoria,
                sumatoriaCon12Decimales: sumatoria.toFixed(12),
                sumatoriaCon15Decimales: sumatoria.toFixed(15),
                detalles: detalles.map(d => ({
                    fecha: d.fecha,
                    flujo: d.flujoCompleto,
                    flujoString: d.flujoCompleto.toString(),
                    flujoCon12Decimales: d.flujoCompleto.toFixed(12),
                    fraccionAnio: d.fraccionAnio,
                    fraccionAnioCon12Decimales: d.fraccionAnio.toFixed(12),
                    factorDescuento: d.factorDescuento,
                    factorDescuentoCon12Decimales: d.factorDescuento.toFixed(12),
                    flujoDescontado: d.flujoDescontado,
                    flujoDescontadoCon12Decimales: d.flujoDescontado.toFixed(12)
                }))
            });
        }
        
        return sumatoria;
    }

    const maxIteraciones = 1000;
    // Tolerancia más estricta para mayor precisión en la TIR
    // Usar tolerancia relativa basada en el valor absoluto de los flujos
    const sumaAbsolutaFlujos = flujos.reduce((sum, f) => sum + Math.abs(f), 0);
    const tolerancia = Math.max(0.000000000001, sumaAbsolutaFlujos * 1e-15); // Tolerancia relativa muy pequeña
    const pasoInicial = 0.01; // Paso inicial de 1%
    const factorReduccion = 0.5; // Reducir paso a la mitad cuando cambia de signo
    
    console.log('🔍 [calcularTIRLocal] Configuración del algoritmo:', {
        maxIteraciones: maxIteraciones,
        tolerancia: tolerancia,
        toleranciaCon12Decimales: tolerancia.toFixed(12),
        sumaAbsolutaFlujos: sumaAbsolutaFlujos,
        pasoInicial: pasoInicial
    });
    
    let tasa = 0.0; // Empezar desde 0%
    let paso = pasoInicial;
    let sumatoria = calcularSumatoria(tasa);
    
    console.log('🔍 calcularTIRLocal - Buscando TIR empezando desde 0%');
    console.log(`  📊 TIR inicial: ${(tasa * 100).toFixed(4)}%`);
    console.log(`  📊 Sumatoria inicial: ${sumatoria.toFixed(12)}`);
    
    // Si la sumatoria ya es 0 (o muy cercana), retornar 0%
    if (Math.abs(sumatoria) < tolerancia) {
        console.log(`✅ calcularTIRLocal - TIR encontrada: 0% (sumatoria ya es 0)`);
        return tasa;
    }
    
    // Determinar dirección inicial: si sumatoria es positiva, aumentar TIR; si es negativa, disminuir
    let direccion = sumatoria > 0 ? 1 : -1; // 1 = aumentar, -1 = disminuir
    let ultimaSumatoria = sumatoria;
    let ultimaTasa = tasa;
    let cambioSigno = false;
    
    console.log(`  📊 Dirección inicial: ${direccion > 0 ? 'Aumentar TIR' : 'Disminuir TIR'}`);
    
    // Iterar ajustando la TIR
    for (let i = 0; i < maxIteraciones; i++) {
        // Ajustar tasa según dirección
        tasa += direccion * paso;
        
        // Limitar tasa a un rango razonable
        if (tasa < -0.99) {
            tasa = -0.99;
            console.log(`  ⚠️ Tasa limitada a -99%`);
        }
        if (tasa > 10) {
            tasa = 10;
            console.log(`  ⚠️ Tasa limitada a 1000%`);
        }
        
        sumatoria = calcularSumatoria(tasa);
        
        // Si encontramos la solución (sumatoria ≈ 0 con 12 decimales de precisión)
        if (Math.abs(sumatoria) < tolerancia) {
            console.log(`✅ [calcularTIRLocal] TIR encontrada en iteración ${i + 1}:`, {
                tir: (tasa * 100).toFixed(8) + '%',
                tirCon12Decimales: (tasa * 100).toFixed(12) + '%',
                sumatoriaFinal: sumatoria.toFixed(12),
                tipoInteresDias: tipoInteresDias
            });
            // Log detallado de la última iteración
            const ultimaSumatoriaDetalle = calcularSumatoria(tasa);
            console.log(`✅ [calcularTIRLocal] Verificación final con TIR=${(tasa * 100).toFixed(12)}%:`, {
                sumatoria: ultimaSumatoriaDetalle,
                sumatoriaCon12Decimales: ultimaSumatoriaDetalle.toFixed(12)
            });
            return tasa;
        }
        
        // Detectar cambio de signo
        if (i > 0 && (ultimaSumatoria * sumatoria < 0)) {
            // Cambió el signo, estamos cerca de la solución
            cambioSigno = true;
            paso *= factorReduccion; // Reducir paso
            direccion *= -1; // Cambiar dirección
            console.log(`  🔄 Iteración ${i + 1}: Cambio de signo detectado. Reduciendo paso a ${(paso * 100).toFixed(4)}%`);
            
            // Si el paso es muy pequeño, usar bisección
            if (paso < 0.0001) {
                console.log(`  🔄 Cambiando a método de bisección...`);
                // Usar bisección entre ultimaTasa y tasa actual
                let tasaMin = Math.min(ultimaTasa, tasa);
                let tasaMax = Math.max(ultimaTasa, tasa);
                
                // Tolerancia más estricta para bisección (mayor precisión)
                const toleranciaBiseccion = Math.max(0.0000000000001, sumaAbsolutaFlujos * 1e-16);
                const toleranciaTasa = 1e-18; // Tolerancia más estricta para la diferencia entre tasas (18 decimales)
                
                console.log(`  🔄 Bisección: tasaMin=${(tasaMin * 100).toFixed(12)}%, tasaMax=${(tasaMax * 100).toFixed(12)}%`);
                
                for (let j = 0; j < 300; j++) { // Aumentar iteraciones para mayor precisión (300 iteraciones)
                    const tasaBiseccion = (tasaMin + tasaMax) / 2;
                    const sumatoriaBiseccion = calcularSumatoria(tasaBiseccion);
                    
                    if (Math.abs(sumatoriaBiseccion) < toleranciaBiseccion) {
                        console.log(`✅ [calcularTIRLocal] TIR encontrada con bisección (iteración ${j + 1}):`, {
                            tir: (tasaBiseccion * 100).toFixed(8) + '%',
                            tirCon12Decimales: (tasaBiseccion * 100).toFixed(12) + '%',
                            tirCon15Decimales: (tasaBiseccion * 100).toFixed(15) + '%',
                            sumatoriaFinal: sumatoriaBiseccion.toFixed(15),
                            tipoInteresDias: tipoInteresDias
                        });
                        return tasaBiseccion;
                    }
                    
                    if (sumatoriaBiseccion > 0) {
                        tasaMin = tasaBiseccion;
                    } else {
                        tasaMax = tasaBiseccion;
                    }
                    
                    // Verificar convergencia tanto por sumatoria como por diferencia de tasas
                    if (Math.abs(tasaMax - tasaMin) < toleranciaTasa) {
                        console.log(`  🔄 Bisección convergida por diferencia de tasas (iteración ${j + 1})`);
                        break;
                    }
                }
                
                tasa = (tasaMin + tasaMax) / 2;
                const sumatoriaFinal = calcularSumatoria(tasa);
                
                // Log detallado de la sumatoria final con todos los flujos
                const detallesFinales = [];
                for (let i = 0; i < flujos.length; i++) {
                    const flujoCompleto = Number(flujos[i]);
                    const fraccionAnio = calcularFraccionAnio(fechaCompraISO, fechas[i], tipoInteresDias);
                    const factorDescuento = fraccionAnio > 0 ? Math.pow(1 + tasa, fraccionAnio) : 1;
                    const flujoDescontado = flujoCompleto / factorDescuento;
                    
                    detallesFinales.push({
                        index: i,
                        fecha: fechas[i],
                        flujo: flujoCompleto,
                        flujoString: flujoCompleto.toString(),
                        flujoCon12Decimales: flujoCompleto.toFixed(12),
                        fraccionAnio: fraccionAnio,
                        fraccionAnioCon12Decimales: fraccionAnio.toFixed(12),
                        tasa: tasa,
                        factorDescuento: factorDescuento,
                        factorDescuentoCon12Decimales: factorDescuento.toFixed(12),
                        flujoDescontado: flujoDescontado,
                        flujoDescontadoCon12Decimales: flujoDescontado.toFixed(12)
                    });
                }
                
                // Log detallado con todos los valores
                console.log(`✅ [calcularTIRLocal] TIR convergida con bisección:`, {
                    tir: (tasa * 100).toFixed(8) + '%',
                    tirCon12Decimales: (tasa * 100).toFixed(12) + '%',
                    tirCon15Decimales: (tasa * 100).toFixed(15) + '%',
                    sumatoriaFinal: sumatoriaFinal,
                    sumatoriaFinalCon12Decimales: sumatoriaFinal.toFixed(12),
                    sumatoriaFinalCon15Decimales: sumatoriaFinal.toFixed(15),
                    tipoInteresDias: tipoInteresDias,
                    fechaCompra: fechaCompraISO,
                    detallesFlujos: detallesFinales
                });
                
                // Log adicional más visible con resumen de flujos
                console.log(`📋 RESUMEN TIR CALCULADA:`, {
                    tir: (tasa * 100).toFixed(12) + '%',
                    sumatoria: sumatoriaFinal.toFixed(15),
                    totalFlujos: flujos.length,
                    flujosUsados: detallesFinales.map(d => ({
                        fecha: d.fecha,
                        flujo: d.flujoCon12Decimales,
                        fraccionAnio: d.fraccionAnioCon12Decimales,
                        factorDescuento: d.factorDescuentoCon12Decimales,
                        flujoDescontado: d.flujoDescontadoCon12Decimales
                    }))
                });
                return tasa;
            }
        } else {
            // No cambió el signo, continuar en la misma dirección
            if (cambioSigno) {
                // Si ya habíamos detectado cambio de signo pero ahora no, volver a reducir paso
                paso *= factorReduccion;
            }
        }
        
        ultimaSumatoria = sumatoria;
        ultimaTasa = tasa;
        
        // Log cada 50 iteraciones o cuando cambia el signo
        if (i % 50 === 0 || cambioSigno) {
            console.log(`  🔄 Iteración ${i + 1}: TIR=${(tasa * 100).toFixed(4)}%, Sumatoria=${sumatoria.toFixed(12)}, Paso=${(paso * 100).toFixed(4)}%`);
        }
    }
    
    console.warn(`⚠️ [calcularTIRLocal] Máximo de iteraciones alcanzado. TIR aproximada:`, {
        tir: (tasa * 100).toFixed(8) + '%',
        tirCon12Decimales: (tasa * 100).toFixed(12) + '%',
        sumatoriaFinal: sumatoria.toFixed(12),
        tipoInteresDias: tipoInteresDias,
        iteraciones: maxIteraciones
    });
    
    // Log detallado de la última iteración
    const ultimaSumatoriaDetalle = calcularSumatoria(tasa);
    console.warn(`⚠️ [calcularTIRLocal] Detalles de última iteración:`, {
        tasa: (tasa * 100).toFixed(12) + '%',
        sumatoria: ultimaSumatoriaDetalle,
        sumatoriaCon12Decimales: ultimaSumatoriaDetalle.toFixed(12),
        tolerancia: tolerancia,
        diferencia: Math.abs(ultimaSumatoriaDetalle).toFixed(12)
    });
    
    return tasa;
}

function limpiarFlujosDescontados() {
    const cupones = window.cuponesModule?.getCuponesData?.() || [];
    cupones.forEach(cupon => {
        if (cupon.flujosDesc) {
            cupon.flujosDesc = '';
        }
        actualizarCampoCupon(cupon, 'flujosDesc', '');
    });
    const sumatoriaSpan = document.getElementById('sumatoriaFlujosDesc');
    if (sumatoriaSpan) {
        sumatoriaSpan.textContent = '0.00000000';
    }
}

function resetearResultadoTIR() {
    ultimaTIRCalculada = null;
    const resultado = document.getElementById('resultadoTIR');
    if (resultado) {
        resultado.textContent = '-';
    }
    limpiarFlujosDescontados();
    
    // Ocultar panel de resultados
    const panelResultados = document.getElementById('panelResultados');
    if (panelResultados) {
        panelResultados.style.display = 'none';
    }
    
    // Limpiar valores de precios
    const preciosIds = ['precioCT', 'precioCTHoyAjustado', 'pagosEfectActualizados', 'precioCTAjustPagos', 'precioTecnicoVencimiento'];
    preciosIds.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '-';
    });
}

function actualizarFlujosDescontadosYSumatoria() {
    const cupones = window.cuponesModule?.getCuponesData?.() || [];
    if (!cupones.length) {
        limpiarFlujosDescontados();
        return;
    }

    const fechaCompraISO = obtenerFechaCompraISO();
    if (!fechaCompraISO || ultimaTIRCalculada === null) {
        limpiarFlujosDescontados();
        return;
    }

    const tipoInteresDias = parseInt(document.getElementById('tipoInteresDias')?.value || '0', 10);
    const decimalesAjustes = obtenerDecimalesAjustes();
    const decimalesFlujos = decimalesAjustes === 12 ? 12 : 8;
    
    console.log('💰 [actualizarFlujosDescontadosYSumatoria] Iniciando cálculo de flujos descontados:', {
        fechaCompraISO: fechaCompraISO,
        ultimaTIRCalculada: ultimaTIRCalculada,
        tipoInteresDias: tipoInteresDias,
        decimalesAjustes: decimalesAjustes,
        decimalesFlujos: decimalesFlujos,
        totalCupones: cupones.length
    });

    let sumatoria = 0;

    cupones.forEach((cupon, index) => {
        const flujoRaw = cupon.flujos;
        const flujo = normalizarNumeroDesdeInput(flujoRaw);
        if (flujo === null || !cupon.fechaLiquid) {
            actualizarCampoCupon(cupon, 'flujosDesc', '');
            return;
        }

        let fechaLiquidISO = cupon.fechaLiquid;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaLiquidISO)) {
            fechaLiquidISO = convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquidISO);
        }

        // Usar Number() para máxima precisión
        const flujoCompleto = Number(flujo);
        const fraccionAnio = calcularFraccionAnio(fechaCompraISO, fechaLiquidISO, tipoInteresDias);
        
        let flujoDesc;
        if (fraccionAnio > 0) {
            // Calcular con máxima precisión usando Math.pow
            flujoDesc = flujoCompleto / Math.pow(1 + ultimaTIRCalculada, fraccionAnio);
        } else {
            flujoDesc = flujoCompleto;
        }

        sumatoria += flujoDesc;
        
        // Log detallado para cada cupón
        const flujoCompletoString = flujoCompleto.toString();
        const flujoCompletoDecimales = flujoCompletoString.includes('.') ? flujoCompletoString.split('.')[1].length : 0;
        const flujoDescString = flujoDesc.toString();
        const flujoDescDecimales = flujoDescString.includes('.') ? flujoDescString.split('.')[1].length : 0;
        
        console.log(`  💰 Cupón ${index} (${cupon.id}):`, {
            fechaLiquidISO: fechaLiquidISO,
            flujoRaw: flujoRaw,
            flujoCompleto: flujoCompleto,
            flujoCompletoString: flujoCompletoString,
            flujoCompletoDecimales: flujoCompletoDecimales,
            fraccionAnio: fraccionAnio,
            flujoDesc: flujoDesc,
            flujoDescString: flujoDescString,
            flujoDescDecimales: flujoDescDecimales,
            flujoDescCon12Decimales: flujoDesc.toFixed(12),
            flujoDescCon8Decimales: flujoDesc.toFixed(8),
            decimalesUsadosParaMostrar: decimalesFlujos
        });
        
        // Si los decimales de ajustes están en 12, usar 12 decimales para los flujos descontados (mayor precisión para TIR)
        actualizarCampoCupon(cupon, 'flujosDesc', formatearNumero(flujoDesc, decimalesFlujos));
    });

    console.log('💰 [actualizarFlujosDescontadosYSumatoria] Sumatoria total:', {
        sumatoria: sumatoria,
        sumatoriaString: sumatoria.toString(),
        sumatoriaCon12Decimales: sumatoria.toFixed(12),
        sumatoriaCon8Decimales: sumatoria.toFixed(8)
    });

    const sumatoriaSpan = document.getElementById('sumatoriaFlujosDesc');
    if (sumatoriaSpan) {
        sumatoriaSpan.textContent = formatearNumero(sumatoria, 8);
    }
}

async function calcularTIR() {
    const btn = document.getElementById('btnCalcularTIR');
    if (btn) {
        btn.disabled = true;
    }

    try {
        const fechaCompraISO = obtenerFechaCompraISO();
        if (!fechaCompraISO) {
            if (typeof showError === 'function') {
                showError('Debe ingresar la fecha de compra.');
            }
            return;
        }

        // Recalcular flujos antes de calcular la TIR para asegurar que estén actualizados
        if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularFlujosCupones === 'function') {
            const cupones = window.cuponesModule?.getCuponesData?.() || [];
            window.cuponesCalculos.recalcularFlujosCupones(cupones);
        }

        const datos = window.cuponesModule?.getCuponesData?.() || [];
        if (!datos.length) {
            if (typeof showError === 'function') {
                showError('Debe cargar la inversión y al menos un cupón.');
            }
            return;
        }

        const inversion = datos.find(c => c.id === 'inversion');
        if (!inversion || normalizarNumeroDesdeInput(inversion.flujos) === null) {
            if (typeof showError === 'function') {
                showError('Complete el flujo de la inversión antes de calcular la TIR.');
            }
            return;
        }

        const cupones = datos.filter(c => c.id !== 'inversion');
        if (!cupones.length) {
            if (typeof showError === 'function') {
                showError('Debe agregar al menos un cupón.');
            }
            return;
        }

        const cuponesSinFlujo = cupones.filter(c => normalizarNumeroDesdeInput(c.flujos) === null);
        if (cuponesSinFlujo.length > 0) {
            if (typeof showError === 'function') {
                showError('Faltan flujos en algunos cupones. Verifique amortizaciones y rentas.');
            }
            return;
        }

        const { flujos, fechas } = recolectarFlujosYFechas();
        if (flujos.length < 2) {
            if (typeof showError === 'function') {
                showError('No hay flujos suficientes para calcular la TIR.');
            }
            return;
        }

        // Log detallado de los flujos que se van a usar para calcular la TIR
        const tipoInteresDias = parseInt(document.getElementById('tipoInteresDias')?.value || '0', 10);
        console.log('🎯 [calcularTIR] Flujos que se usarán para calcular la TIR:', {
            fechaCompra: fechaCompraISO,
            tipoInteresDias: tipoInteresDias,
            totalFlujos: flujos.length,
            flujos: flujos.map((f, i) => ({
                index: i,
                fecha: fechas[i],
                flujo: f,
                flujoString: f.toString(),
                flujoCon12Decimales: f.toFixed(12),
                flujoCon15Decimales: f.toFixed(15)
            }))
        });

        const tir = calcularTIRLocal(flujos, fechas, fechaCompraISO);
        ultimaTIRCalculada = tir;

        const resultado = document.getElementById('resultadoTIR');
        if (resultado) {
            resultado.textContent = (tir * 100).toFixed(8) + '%';
        }

        actualizarFlujosDescontadosYSumatoria();
        
        // Recalcular factores de actualización y pagos actualizados después de calcular la TIR
        if (window.cuponesCalculos && window.cuponesCalculos.recalcularValoresDerivados) {
            const cupones = window.cuponesModule?.getCuponesData?.() || [];
            window.cuponesCalculos.recalcularValoresDerivados(cupones);
        }
        
        // Renderizar la tabla para mostrar los valores actualizados (después de todos los recálculos)
        setTimeout(() => {
            if (window.cuponesModule && typeof window.cuponesModule.renderizarCupones === 'function') {
                window.cuponesModule.renderizarCupones();
            }
            
            // Calcular y mostrar precios después de renderizar
            if (window.preciosModule && typeof window.preciosModule.recalcularTodosPrecios === 'function') {
                window.preciosModule.recalcularTodosPrecios();
            }
            
            // Mostrar panel de resultados
            const panelResultados = document.getElementById('panelResultados');
            if (panelResultados) {
                panelResultados.style.display = 'block';
                
                // Mostrar/ocultar "Precio C+T Ajustado" según ajusteCER
                const ajusteCER = document.getElementById('ajusteCER')?.checked || false;
                const precioCTAjustadoContainer = document.getElementById('precioCTAjustadoContainer');
                if (precioCTAjustadoContainer) {
                    precioCTAjustadoContainer.style.display = ajusteCER ? 'flex' : 'none';
                }
            }
        }, 50);

        if (typeof showSuccess === 'function') {
            showSuccess('TIR calculada: ' + (tir * 100).toFixed(8) + '%');
        } else {
            console.log('TIR calculada:', tir);
        }
    } catch (error) {
        console.error('Error al calcular TIR:', error);
        if (typeof showError === 'function') {
            showError('Error al calcular la TIR: ' + error.message);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
        }
    }
}

window.tirModule = {
    calcularTIR,
    actualizarFlujosDescontadosYSumatoria,
    resetTIR: resetearResultadoTIR,
    getUltimaTIR: () => ultimaTIRCalculada
};

window.calcularTIR = calcularTIR;

