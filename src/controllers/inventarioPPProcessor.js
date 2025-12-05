/**
 * Procesador de movimientos PP (Pases Pasivos)
 */

const { formatearNumero, calcularSaldoDisponible, obtenerPartidasDisponibles, esMismoDia, crearImputacion } = require('./inventarioUtils');

/**
 * Procesa un ingreso PP
 */
function procesarIngresoPP(mov, movimientos, partidas, distribucionesPP, egresosPPProcesadosRetroactivamente, ingresosPPProcesadosRetroactivamente, partidaIdCounter, errores) {
    // Si ya fue procesado retroactivamente, saltarlo
    if (ingresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
        const distribucionExistente = distribucionesPP[mov.minutaOrigen];
        if (!distribucionExistente || distribucionExistente.length === 0) {
            errores.push({
                movimiento: mov,
                mensaje: `El ingreso PP ${mov.minutaOrigen} fue procesado retroactivamente pero no se encontró su distribución guardada`
            });
            return { procesado: false, error: true };
        }
        delete distribucionesPP[mov.minutaOrigen];
        return { procesado: false, saltado: true };
    }
    
    let distribucion = distribucionesPP[mov.minutaOrigen];
    
    if (!distribucion || distribucion.length === 0) {
        // Buscar egreso PP correspondiente
        const indiceActual = movimientos.indexOf(mov);
        const egresoPPAnterior = movimientos.slice(0, indiceActual).find(m => {
            return m.tipoMin === 'PP' && 
                   m.tipoMov === 'E' && 
                   m.minutaOrigen === mov.minutaOrigen;
        });
        
        let egresoPP = egresoPPAnterior;
        
        // Si no se encuentra en movimientos anteriores, buscar pendiente del mismo día
        if (!egresoPP) {
            const egresoPPDelMismoDia = movimientos.find(m => {
                return esMismoDia(m.fecha, mov.fecha) &&
                       m.tipoMin === 'PP' &&
                       m.tipoMov === 'E' &&
                       m.minutaOrigen === mov.minutaOrigen &&
                       m !== mov &&
                       movimientos.indexOf(m) > indiceActual;
            });
            
            if (egresoPPDelMismoDia) {
                egresoPP = egresoPPDelMismoDia;
                egresosPPProcesadosRetroactivamente.add(egresoPP.minutaOrigen);
            }
        }
        
        if (egresoPP) {
            // Procesar el egreso PP primero
            const resultadoEgreso = procesarEgresoPPParaIngreso(egresoPP, partidas, errores);
            if (resultadoEgreso.error) {
                return { procesado: false, error: true };
            }
            
            distribucionesPP[mov.minutaOrigen] = resultadoEgreso.distribucion;
            distribucion = resultadoEgreso.distribucion;
            
            if (egresoPPAnterior) {
                egresosPPProcesadosRetroactivamente.add(egresoPP.minutaOrigen);
            }
        } else {
            errores.push({
                movimiento: mov,
                mensaje: `No se encontró un egreso PP previo con MINUTA_ORIGEN ${mov.minutaOrigen} para aplicar el ingreso PP.`
            });
            return { procesado: false, error: true };
        }
    }
    
    // Verificar distribución
    if (!distribucion || distribucion.length === 0) {
        errores.push({
            movimiento: mov,
            mensaje: `No se encontró distribución para el ingreso PP con MINUTA_ORIGEN ${mov.minutaOrigen}`
        });
        return { procesado: false, error: true };
    }
    
    // Verificar cantidad
    const cantidadTotalDistribucion = distribucion.reduce((sum, d) => sum + d.cantidad, 0);
    if (Math.abs(cantidadTotalDistribucion - mov.cantidad) > 0.01) {
        errores.push({
            movimiento: mov,
            mensaje: `La cantidad del ingreso PP (${mov.cantidad}) no coincide con la cantidad del egreso PP (${cantidadTotalDistribucion}) para MINUTA_ORIGEN ${mov.minutaOrigen}`
        });
        return { procesado: false, error: true };
    }
    
    // Aplicar el ingreso en las mismas partidas
    let cantidadTotalAplicada = 0;
    const saldoAntes = calcularSaldoDisponible(partidas);
    
    for (const dist of distribucion) {
        const partida = partidas.find(p => p.id === dist.partidaId);
        if (!partida) {
            errores.push({
                movimiento: mov,
                mensaje: `No se encontró la partida ${dist.partidaId} para aplicar el ingreso PP`
            });
            return { procesado: false, error: true };
        }
        
        partida.saldo += dist.cantidad;
        cantidadTotalAplicada += dist.cantidad;
        partida.imputaciones.push(crearImputacion(mov, dist.cantidad, partida.saldo));
    }
    
    const saldoDespues = calcularSaldoDisponible(partidas);
    console.log(`[INGRESO PP] ${mov.minutaOrigen} | Aplicado: ${cantidadTotalAplicada.toLocaleString('es-AR')} | Saldo después: ${saldoDespues.toLocaleString('es-AR')}`);
    
    // Eliminar distribución si el egreso PP ya fue procesado
    if (egresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
        delete distribucionesPP[mov.minutaOrigen];
    }
    
    return { procesado: true };
}

/**
 * Procesa un egreso PP para crear su distribución (usado por ingreso PP)
 */
function procesarEgresoPPParaIngreso(egresoPP, partidas, errores) {
    let cantidadRestante = egresoPP.cantidad;
    const partidasDisponibles = obtenerPartidasDisponibles(partidas);
    const distribucion = [];
    
    for (const partida of partidasDisponibles) {
        if (cantidadRestante <= 0) break;
        
        const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
        partida.saldo -= cantidadAplicar;
        cantidadRestante -= cantidadAplicar;
        
        partida.imputaciones.push(crearImputacion(egresoPP, -cantidadAplicar, partida.saldo));
        
        distribucion.push({
            partidaId: partida.id,
            cantidad: cantidadAplicar
        });
    }
    
    if (cantidadRestante > 0) {
        errores.push({
            movimiento: egresoPP,
            mensaje: `No hay suficiente saldo para procesar el egreso PP. Faltante: ${cantidadRestante}. MINUTA_ORIGEN: ${egresoPP.minutaOrigen}`
        });
        return { error: true };
    }
    
    return { distribucion, error: false };
}

/**
 * Procesa un egreso PP normal
 */
function procesarEgresoPP(mov, movimientos, partidas, distribucionesPP, egresosPPProcesadosRetroactivamente, ingresosPPProcesadosRetroactivamente, partidaIdCounter, indiceActual, errores) {
    // Si ya fue procesado retroactivamente, saltarlo
    if (egresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
        let distribucionExistente = distribucionesPP[mov.minutaOrigen];
        
        if (!distribucionExistente || distribucionExistente.length === 0) {
            // Intentar recrear desde imputaciones
            const imputacionesEgreso = [];
            partidas.forEach(p => {
                p.imputaciones.forEach(imp => {
                    if (imp.tipoMin === 'PP' && 
                        imp.tipoMov === 'E' && 
                        imp.minutaOrigen === mov.minutaOrigen &&
                        imp.fechaStr === mov.fechaStr) {
                        imputacionesEgreso.push({
                            partidaId: p.id,
                            cantidad: Math.abs(imp.cantidad)
                        });
                    }
                });
            });
            
            if (imputacionesEgreso.length > 0) {
                distribucionExistente = imputacionesEgreso;
                distribucionesPP[mov.minutaOrigen] = distribucionExistente;
            } else {
                errores.push({
                    movimiento: mov,
                    mensaje: `El egreso PP ${mov.minutaOrigen} fue procesado retroactivamente pero no se encontró su distribución guardada ni se pudo recrear desde las imputaciones`
                });
                return { procesado: false, error: true };
            }
        }
        return { procesado: false, saltado: true };
    }
    
    const partidasDisponibles = obtenerPartidasDisponibles(partidas);
    const saldoTotalDisponible = partidasDisponibles.reduce((sum, p) => sum + p.saldo, 0);
    const distribucion = [];
    let cantidadRestante = mov.cantidad;
    
    // Aplicar FIFO
    for (const partida of partidasDisponibles) {
        if (cantidadRestante <= 0) break;
        
        const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
        partida.saldo -= cantidadAplicar;
        cantidadRestante -= cantidadAplicar;
        
        partida.imputaciones.push(crearImputacion(mov, -cantidadAplicar, partida.saldo));
        
        distribucion.push({
            partidaId: partida.id,
            cantidad: cantidadAplicar
        });
    }
    
    // Si hay faltante, buscar ingresos pendientes del mismo día
    if (cantidadRestante > 0) {
        const resultado = procesarIngresosPendientesParaEgresoPP(
            mov, movimientos, partidas, distribucionesPP, 
            ingresosPPProcesadosRetroactivamente, partidaIdCounter, indiceActual, cantidadRestante, distribucion, errores
        );
        
        if (resultado.error) {
            return { procesado: false, error: true };
        }
        
        cantidadRestante = resultado.cantidadRestante;
        distribucion.push(...resultado.distribucionAdicional);
    }
    
    // Guardar distribución
    distribucionesPP[mov.minutaOrigen] = distribucion;
    
    const saldoDespues = calcularSaldoDisponible(partidas);
    console.log(`[EGRESO PP] ${mov.minutaOrigen} | Aplicado: ${(mov.cantidad - cantidadRestante).toLocaleString('es-AR')} | Saldo después: ${saldoDespues.toLocaleString('es-AR')}`);
    
    return { procesado: true, cantidadRestante };
}

/**
 * Procesa ingresos pendientes del mismo día para ayudar a un egreso PP
 */
function procesarIngresosPendientesParaEgresoPP(mov, movimientos, partidas, distribucionesPP, ingresosPPProcesadosRetroactivamente, partidaIdCounter, indiceActual, cantidadRestante, distribucion, errores) {
    const ingresosDelDiaPendientes = movimientos.filter(m => {
        return esMismoDia(m.fecha, mov.fecha) &&
               m.tipoMov === 'I' &&
               m !== mov &&
               movimientos.indexOf(m) > indiceActual;
    });
    
    const partidasDelDiaConSaldo = partidas.filter(p => {
        if (p.saldo <= 0 || p.tipoMin === 'PA') return false;
        if (!p.fecha) return false;
        return esMismoDia(p.fecha, mov.fecha);
    });
    
    const saldoDisponiblePartidasDelDia = partidasDelDiaConSaldo.reduce((sum, p) => sum + p.saldo, 0);
    
    ingresosDelDiaPendientes.sort((a, b) => movimientos.indexOf(a) - movimientos.indexOf(b));
    
    let parCompletoProcesado = false;
    let distribucionAdicional = [];
    
    if (ingresosDelDiaPendientes.length > 0) {
        const ingresosQueCreanPartidas = ingresosDelDiaPendientes.filter(ing => ['TRFU', 'C', 'ING', 'PA'].includes(ing.tipoMin));
        const ingresosPP = ingresosDelDiaPendientes.filter(ing => ing.tipoMin === 'PP');
        
        // Procesar ingresos que crean partidas
        for (const ingreso of ingresosQueCreanPartidas) {
            if (cantidadRestante <= 0) break;
            
            const partidaExistente = partidas.find(p => 
                p.tipoMin === ingreso.tipoMin &&
                p.minutaOrigen === ingreso.minutaOrigen &&
                p.fecha.getTime() === ingreso.fecha.getTime()
            );
            
            if (!partidaExistente) {
                const partida = {
                    id: partidaIdCounter++,
                    tipoMin: ingreso.tipoMin,
                    tipoMov: ingreso.tipoMov,
                    minutaOrigen: ingreso.minutaOrigen,
                    fecha: ingreso.fecha,
                    fechaStr: ingreso.fechaStr,
                    cantidadInicial: ingreso.cantidad,
                    saldo: ingreso.cantidad,
                    cerrada: false,
                    imputaciones: []
                };
                partidas.push(partida);
            }
        }
        
        // Procesar ingresos PP pendientes
        for (const ingresoPP of ingresosPP) {
            if (cantidadRestante <= 0) break;
            
            const esElMovimientoActual = mov.tipoMin === 'PP' &&
                                         mov.tipoMov === 'E' &&
                                         mov.minutaOrigen === ingresoPP.minutaOrigen &&
                                         esMismoDia(mov.fecha, ingresoPP.fecha);
            
            const egresoPPDelDia = esElMovimientoActual ? mov : movimientos.find(m => {
                return esMismoDia(m.fecha, ingresoPP.fecha) &&
                       m.tipoMin === 'PP' &&
                       m.tipoMov === 'E' &&
                       m.minutaOrigen === ingresoPP.minutaOrigen &&
                       m !== mov;
            });
            
            if (egresoPPDelDia) {
                if (esElMovimientoActual) {
                    // Procesar par completo E/I
                    const resultado = procesarParPPCompleto(mov, ingresoPP, partidas, distribucionesPP, ingresosPPProcesadosRetroactivamente, errores);
                    if (resultado.error) {
                        return { error: true };
                    }
                    
                    distribucion.length = 0;
                    distribucion.push(...resultado.distribucion);
                    cantidadRestante = 0;
                    parCompletoProcesado = true;
                } else {
                    // Procesar otro par PP del mismo día
                    const resultadoEgreso = procesarEgresoPPParaIngreso(egresoPPDelDia, partidas, errores);
                    if (resultadoEgreso.error) {
                        continue;
                    }
                    
                    distribucionesPP[ingresoPP.minutaOrigen] = resultadoEgreso.distribucion;
                    ingresosPPProcesadosRetroactivamente.add(ingresoPP.minutaOrigen);
                    
                    // Aplicar ingreso PP
                    for (const dist of resultadoEgreso.distribucion) {
                        const partida = partidas.find(p => p.id === dist.partidaId);
                        if (partida) {
                            partida.saldo += dist.cantidad;
                            partida.imputaciones.push(crearImputacion(ingresoPP, dist.cantidad, partida.saldo));
                        }
                    }
                }
            }
        }
        
        // Reintentar aplicar el egreso PP con nuevas partidas
        if (!parCompletoProcesado) {
            const partidasActualizadas = obtenerPartidasDisponibles(partidas);
            for (const partida of partidasActualizadas) {
                if (cantidadRestante <= 0) break;
                
                const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
                partida.saldo -= cantidadAplicar;
                cantidadRestante -= cantidadAplicar;
                
                partida.imputaciones.push(crearImputacion(mov, -cantidadAplicar, partida.saldo));
                distribucionAdicional.push({
                    partidaId: partida.id,
                    cantidad: cantidadAplicar
                });
            }
        }
    } else if (saldoDisponiblePartidasDelDia > 0) {
        // Usar partidas del mismo día directamente
        partidasDelDiaConSaldo.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        
        for (const partida of partidasDelDiaConSaldo) {
            if (cantidadRestante <= 0) break;
            
            const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
            partida.saldo -= cantidadAplicar;
            cantidadRestante -= cantidadAplicar;
            
            partida.imputaciones.push(crearImputacion(mov, -cantidadAplicar, partida.saldo));
            distribucionAdicional.push({
                partidaId: partida.id,
                cantidad: cantidadAplicar
            });
        }
    }
    
    // Verificar si hay ingreso PP pendiente correspondiente
    const ingresoPPCorrespondientePendiente = movimientos
        .slice(indiceActual + 1)
        .find(m => {
            return esMismoDia(m.fecha, mov.fecha) &&
                   m.tipoMin === 'PP' &&
                   m.tipoMov === 'I' &&
                   m.minutaOrigen === mov.minutaOrigen;
        });
    
    // Generar error si hay faltante y no hay ingreso PP pendiente
    if (cantidadRestante > 0 && !parCompletoProcesado && !ingresoPPCorrespondientePendiente) {
        const mensajeError = construirMensajeErrorEgresoPP(mov, movimientos, partidas, cantidadRestante, indiceActual);
        errores.push({
            movimiento: mov,
            mensaje: mensajeError
        });
        return { error: true };
    }
    
    return { cantidadRestante, distribucionAdicional, error: false };
}

/**
 * Procesa un par PP completo (E/I del mismo día)
 */
function procesarParPPCompleto(egresoPP, ingresoPP, partidas, distribucionesPP, ingresosPPProcesadosRetroactivamente, errores) {
    // Revertir aplicación parcial del egreso PP
    // (esto se hace en el código principal antes de llamar a esta función)
    
    // Procesar egreso PP completo
    let cantidadRestante = egresoPP.cantidad;
    const partidasDisponibles = obtenerPartidasDisponibles(partidas);
    const distribucion = [];
    
    for (const partida of partidasDisponibles) {
        if (cantidadRestante <= 0) break;
        
        const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
        partida.saldo -= cantidadAplicar;
        cantidadRestante -= cantidadAplicar;
        
        distribucion.push({
            partidaId: partida.id,
            cantidad: cantidadAplicar
        });
    }
    
    if (cantidadRestante > 0) {
        return { error: true };
    }
    
    // Guardar distribución y aplicar ingreso PP
    distribucionesPP[ingresoPP.minutaOrigen] = distribucion;
    ingresosPPProcesadosRetroactivamente.add(ingresoPP.minutaOrigen);
    
    // Aplicar ingreso PP
    for (const dist of distribucion) {
        const partida = partidas.find(p => p.id === dist.partidaId);
        if (partida) {
            partida.saldo += dist.cantidad;
            partida.imputaciones.push(crearImputacion(egresoPP, -dist.cantidad, partida.saldo));
            partida.imputaciones.push(crearImputacion(ingresoPP, dist.cantidad, partida.saldo));
        }
    }
    
    return { distribucion, error: false };
}

/**
 * Construye mensaje de error detallado para egreso PP
 */
function construirMensajeErrorEgresoPP(mov, movimientos, partidas, cantidadRestante, indiceActual) {
    const { formatearNumero, calcularSaldoDisponible } = require('./inventarioUtils');
    
    const cantidadAplicada = mov.cantidad - cantidadRestante;
    const saldoFinal = calcularSaldoDisponible(partidas);
    
    const saldoInicioDia = partidas
        .filter(p => {
            if (p.tipoMin === 'PA') return false;
            if (!p.fecha || !mov.fecha) return false;
            return p.fecha.getTime() < new Date(mov.fecha.getFullYear(), mov.fecha.getMonth(), mov.fecha.getDate()).getTime();
        })
        .reduce((sum, p) => {
            const imputacionesDelDia = p.imputaciones.filter(imp => {
                if (!imp.fecha || !mov.fecha) return false;
                return imp.fecha.getFullYear() === mov.fecha.getFullYear() &&
                       imp.fecha.getMonth() === mov.fecha.getMonth() &&
                       imp.fecha.getDate() === mov.fecha.getDate();
            });
            const saldoOriginal = p.saldo + imputacionesDelDia.reduce((s, imp) => s - imp.cantidad, 0);
            return sum + saldoOriginal;
        }, 0);
    
    const ingresosAplicadosDia = movimientos
        .slice(0, indiceActual + 1)
        .filter(m => {
            return esMismoDia(m.fecha, mov.fecha) && 
                   m.tipoMov === 'I' && 
                   ['TRFU', 'C', 'ING', 'PA'].includes(m.tipoMin);
        })
        .reduce((sum, m) => sum + m.cantidad, 0);
    
    const egresosAplicadosDia = movimientos
        .slice(0, indiceActual + 1)
        .filter(m => {
            return esMismoDia(m.fecha, mov.fecha) && 
                   m.tipoMov === 'E' && 
                   m.tipoMin !== 'PA';
        })
        .reduce((sum, m) => sum + m.cantidad, 0);
    
    const partidasDisponiblesActuales = obtenerPartidasDisponibles(partidas);
    const detallePartidas = partidasDisponiblesActuales.length > 0
        ? partidasDisponiblesActuales
            .map(p => `Partida ${p.id} (${p.tipoMin}, ${p.fechaStr}): ${formatearNumero(p.saldo)}`)
            .join(' | ')
        : 'No hay partidas disponibles con saldo';
    
    const ingresosPendientesDia = movimientos
        .slice(indiceActual + 1)
        .filter(m => esMismoDia(m.fecha, mov.fecha) && m.tipoMov === 'I');
    
    let infoIngresosPendientes = '';
    if (ingresosPendientesDia.length > 0) {
        const totalIngresosPendientes = ingresosPendientesDia.reduce((sum, m) => sum + m.cantidad, 0);
        const detalleIngresosPendientes = ingresosPendientesDia
            .map(m => `${m.tipoMin} | ${m.minutaOrigen} | ${formatearNumero(m.cantidad)}`)
            .join(' | ');
        
        infoIngresosPendientes = [
            `Ingresos pendientes de procesar para ${mov.fechaStr}: ${ingresosPendientesDia.length} movimiento(s)`,
            `Total ingresos pendientes: ${formatearNumero(totalIngresosPendientes)}`,
            `Detalle ingresos pendientes: ${detalleIngresosPendientes}`
        ].join('\n');
    } else {
        infoIngresosPendientes = `No hay ingresos pendientes a la fecha ${mov.fechaStr}`;
    }
    
    return [
        `No hay suficiente saldo en las partidas para cubrir el egreso PP.`,
        `Fecha: ${mov.fechaStr}`,
        `Requerido: ${formatearNumero(mov.cantidad)}`,
        `Saldo disponible al inicio del día: ${formatearNumero(Math.max(0, saldoInicioDia))}`,
        `Ingresos aplicados del día: ${formatearNumero(ingresosAplicadosDia)}`,
        `Egresos aplicados del día: ${formatearNumero(egresosAplicadosDia)}`,
        `Aplicado: ${formatearNumero(cantidadAplicada)}`,
        `Faltante: ${formatearNumero(cantidadRestante)}`,
        `Cantidad de partidas disponibles: ${partidasDisponiblesActuales.length}`,
        `Detalle partidas: ${detallePartidas}`,
        ``,
        infoIngresosPendientes
    ].join('\n');
}

module.exports = {
    procesarIngresoPP,
    procesarEgresoPP,
    procesarEgresoPPParaIngreso,
    procesarIngresosPendientesParaEgresoPP,
    procesarParPPCompleto
};

