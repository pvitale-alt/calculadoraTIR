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

    datos.forEach(cupon => {
        if (!cupon.fechaLiquid) {
            return;
        }

        const flujo = normalizarNumeroDesdeInput(cupon.flujos);
        if (flujo === null) {
            return;
        }

        let fechaLiquid = cupon.fechaLiquid;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaLiquid)) {
            fechaLiquid = convertirFechaDDMMAAAAaYYYYMMDD(fechaLiquid);
        }

        items.push({
            flujo: Number(flujo), // Usar Number() para máxima precisión
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

    return { flujos, fechas };
}

function calcularTIRLocal(flujos, fechas, fechaCompraISO) {
    // Obtener tipoInteresDias (base) para calcular fracciones de año
    const tipoInteresDias = parseInt(document.getElementById('tipoInteresDias')?.value || '0', 10);
    
    console.log('🔢 calcularTIRLocal - Iniciando cálculo TIR');
    console.log('📊 calcularTIRLocal - Tipo Interés Días:', tipoInteresDias);
    console.log('📊 calcularTIRLocal - Fecha Compra:', fechaCompraISO);
    console.log('📊 calcularTIRLocal - Flujos:', flujos);
    console.log('📊 calcularTIRLocal - Fechas:', fechas);

    // Función para calcular la sumatoria de flujos descontados para una tasa dada
    // IMPORTANTE: Usar valores completos sin truncar para máxima precisión
    function calcularSumatoria(tasa) {
        let sumatoria = 0;
        for (let i = 0; i < flujos.length; i++) {
            // Usar valores completos sin truncar
            const flujoCompleto = Number(flujos[i]);
            const fraccionAnio = calcularFraccionAnio(fechaCompraISO, fechas[i], tipoInteresDias);
            let flujoDescontado;
            
            if (fraccionAnio > 0) {
                // Calcular con máxima precisión usando Math.pow
                flujoDescontado = flujoCompleto / Math.pow(1 + tasa, fraccionAnio);
            } else {
                flujoDescontado = flujoCompleto;
            }
            
            // Log detallado para debugging (solo en primera iteración)
            if (tasa === 0 && i === 0) {
                console.log(`  📊 Flujo ${i + 1}: Fecha=${fechas[i]}, Fracción año=${fraccionAnio.toFixed(8)}, Flujo=${flujoCompleto.toFixed(8)}`);
            }
            
            // Acumular sin truncar hasta el final
            sumatoria += flujoDescontado;
        }
        return sumatoria;
    }

    const maxIteraciones = 1000;
    const tolerancia = 0.000000000001; // Tolerancia para considerar sumatoria = 0 (12 decimales de precisión)
    const pasoInicial = 0.01; // Paso inicial de 1%
    const factorReduccion = 0.5; // Reducir paso a la mitad cuando cambia de signo
    
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
            console.log(`✅ calcularTIRLocal - TIR encontrada en iteración ${i + 1}: ${(tasa * 100).toFixed(4)}%`);
            console.log(`  📊 Sumatoria final: ${sumatoria.toFixed(12)} (debe ser 0.000000000000)`);
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
                
                for (let j = 0; j < 100; j++) {
                    const tasaBiseccion = (tasaMin + tasaMax) / 2;
                    const sumatoriaBiseccion = calcularSumatoria(tasaBiseccion);
                    
                    if (Math.abs(sumatoriaBiseccion) < tolerancia) {
                        console.log(`✅ calcularTIRLocal - TIR encontrada con bisección: ${(tasaBiseccion * 100).toFixed(4)}%`);
                        console.log(`  📊 Sumatoria final: ${sumatoriaBiseccion.toFixed(12)} (debe ser 0.000000000000)`);
                        return tasaBiseccion;
                    }
                    
                    if (sumatoriaBiseccion > 0) {
                        tasaMin = tasaBiseccion;
                    } else {
                        tasaMax = tasaBiseccion;
                    }
                    
                    if (Math.abs(tasaMax - tasaMin) < tolerancia) {
                        break;
                    }
                }
                
                tasa = (tasaMin + tasaMax) / 2;
                const sumatoriaFinal = calcularSumatoria(tasa);
                console.log(`✅ calcularTIRLocal - TIR convergida con bisección: ${(tasa * 100).toFixed(4)}%`);
                console.log(`  📊 Sumatoria final: ${sumatoriaFinal.toFixed(12)} (debe ser 0.000000000000)`);
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
    
    console.log(`⚠️ calcularTIRLocal - Máximo de iteraciones alcanzado. TIR aproximada: ${(tasa * 100).toFixed(4)}%`);
    console.log(`  📊 Sumatoria final: ${sumatoria.toFixed(12)}`);
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
    let sumatoria = 0;

    cupones.forEach(cupon => {
        const flujo = normalizarNumeroDesdeInput(cupon.flujos);
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
        actualizarCampoCupon(cupon, 'flujosDesc', formatearNumero(flujoDesc, 8));
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

