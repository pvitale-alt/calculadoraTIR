/**
 * Controlador para operaciones relacionadas con Inventario FIFO
 */

const XLSX = require('xlsx');

const inventarioController = {
    /**
     * Renderiza la página de Inventario
     */
    renderInventario: async (req, res) => {
        try {
            res.render('pages/inventario', {
                title: 'Inventario FIFO',
                activeMenu: 'inventario'
            });
        } catch (error) {
            console.error('Error al renderizar Inventario:', error);
            res.status(500).render('pages/404', {
                title: 'Error',
                activeMenu: ''
            });
        }
    },

    /**
     * Procesa el archivo Excel y calcula el inventario FIFO
     */
    procesarInventario: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No se proporcionó ningún archivo'
                });
            }

            // Leer el archivo Excel
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON
            const datos = XLSX.utils.sheet_to_json(worksheet, { 
                header: ['TIPO_MIN', 'TIPO_MOV', 'MINUTA_ORIGEN', 'CANTIDAD', 'FECHA'],
                defval: null
            });

            // Validar que tenga las columnas necesarias
            if (datos.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'El archivo Excel está vacío'
                });
            }

            // Obtener fecha límite si se proporciona (puede venir de req.body o req.query)
            let fechaLimite = null;
            const fechaLimiteStr = req.body.fechaLimite || req.query.fechaLimite;
            if (fechaLimiteStr) {
                // Aceptar formato DD/MM/AAAA o DD-MM-AAAA
                const partesFecha = String(fechaLimiteStr).trim().split(/[-\/]/);
                if (partesFecha.length === 3) {
                    const dia = parseInt(partesFecha[0], 10);
                    const mes = parseInt(partesFecha[1], 10) - 1;
                    const anio = parseInt(partesFecha[2], 10);
                    if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
                        fechaLimite = new Date(anio, mes, dia, 23, 59, 59, 999); // Fin del día
                    }
                }
            }

            // Procesar y ordenar los datos
            const movimientos = datos
                .map((row, index) => {
                    // Limpiar y normalizar todos los campos, eliminando espacios en blanco
                    const tipoMin = row.TIPO_MIN ? String(row.TIPO_MIN).trim().toUpperCase() : '';
                    const tipoMov = row.TIPO_MOV ? String(row.TIPO_MOV).trim().toUpperCase() : '';
                    const minutaOrigen = row.MINUTA_ORIGEN ? String(row.MINUTA_ORIGEN).trim() : '';
                    const cantidadRaw = row.CANTIDAD;
                    const fechaRaw = row.FECHA;
                    
                    // Parsear fecha - puede venir en diferentes formatos
                    let fecha = null;
                    let fechaStr = '';
                    
                    if (fechaRaw) {
                        // Limpiar espacios en blanco de la fecha antes de procesarla
                        fechaStr = String(fechaRaw).trim();
                        
                        // Si es un número (fecha serial de Excel)
                        if (!isNaN(fechaRaw) && typeof fechaRaw === 'number') {
                            const fechaParsed = XLSX.SSF.parse_date_code(fechaRaw);
                            if (fechaParsed) {
                                fecha = new Date(fechaParsed.y, fechaParsed.m - 1, fechaParsed.d);
                                // Formatear como DD/MM/AAAA
                                const dia = String(fechaParsed.d).padStart(2, '0');
                                const mes = String(fechaParsed.m).padStart(2, '0');
                                fechaStr = `${dia}/${mes}/${fechaParsed.y}`;
                            }
                        } else {
                            // Limpiar espacios adicionales que puedan estar en el formato de fecha
                            fechaStr = fechaStr.replace(/\s+/g, '');
                            
                            // Intentar parsear como DD/MM/AAAA
                            const partes = fechaStr.split('/');
                            if (partes.length === 3) {
                                const dia = parseInt(partes[0].trim(), 10);
                                const mes = parseInt(partes[1].trim(), 10) - 1; // Mes en JS es 0-11
                                const anio = parseInt(partes[2].trim(), 10);
                                if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
                                    fecha = new Date(anio, mes, dia);
                                }
                            } else {
                                // Intentar parsear como fecha ISO o Date object
                                const fechaDate = new Date(fechaStr);
                                if (!isNaN(fechaDate.getTime())) {
                                    fecha = fechaDate;
                                    // Formatear como DD/MM/AAAA
                                    const dia = String(fecha.getDate()).padStart(2, '0');
                                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                                    const anio = fecha.getFullYear();
                                    fechaStr = `${dia}/${mes}/${anio}`;
                                }
                            }
                        }
                    }

                    // Parsear cantidad, manejando espacios y valores vacíos
                    let cantidad = 0;
                    if (cantidadRaw !== null && cantidadRaw !== undefined && cantidadRaw !== '') {
                        const cantidadStr = String(cantidadRaw).trim().replace(/\s+/g, '');
                        const cantidadParsed = parseFloat(cantidadStr);
                        if (!isNaN(cantidadParsed)) {
                            cantidad = cantidadParsed;
                        }
                    }

                    return {
                        index: index + 1,
                        tipoMin: tipoMin,
                        tipoMov: tipoMov,
                        minutaOrigen: minutaOrigen,
                        cantidad: cantidad,
                        fecha: fecha,
                        fechaStr: fechaStr
                    };
                })
                .filter(mov => {
                    // Validar que tenga todos los campos necesarios (después de limpiar espacios)
                    const tieneCampos = mov.tipoMin && 
                           mov.tipoMov && 
                           mov.fecha && 
                           !isNaN(mov.cantidad) && 
                           mov.cantidad !== 0;
                    
                    // Si hay fecha límite, filtrar movimientos hasta esa fecha
                    if (tieneCampos && fechaLimite) {
                        return mov.fecha.getTime() <= fechaLimite.getTime();
                    }
                    
                    return tieneCampos;
                });

            // Función auxiliar para verificar si hay "pata presente" (movimiento complementario en misma fecha)
            const tienePataPresenteMismaFecha = (mov, todosMovimientos) => {
                // Buscar movimiento complementario del mismo tipo pero movimiento opuesto en la misma fecha
                return todosMovimientos.some(m => {
                    const mismaFecha = m.fecha && mov.fecha &&
                        m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                        m.fecha.getMonth() === mov.fecha.getMonth() &&
                        m.fecha.getDate() === mov.fecha.getDate();
                    return mismaFecha &&
                           m.tipoMin === mov.tipoMin &&
                           m.tipoMov !== mov.tipoMov &&
                           m !== mov;
                });
            };

            // Función auxiliar para verificar si hay "pata futura" (movimiento complementario en distinta fecha)
            const tienePataFuturaDistintaFecha = (mov, todosMovimientos) => {
                // Buscar movimiento complementario del mismo tipo pero movimiento opuesto en distinta fecha
                return todosMovimientos.some(m => {
                    const distintaFecha = m.fecha && mov.fecha &&
                        (m.fecha.getFullYear() !== mov.fecha.getFullYear() ||
                         m.fecha.getMonth() !== mov.fecha.getMonth() ||
                         m.fecha.getDate() !== mov.fecha.getDate());
                    return distintaFecha &&
                           m.tipoMin === mov.tipoMin &&
                           m.tipoMov !== mov.tipoMov &&
                           m !== mov;
                });
            };

            // Función auxiliar para verificar si un OCT tiene pata futuro en la misma fecha
            const tienePataFuturoMismaFecha = (mov, todosMovimientos) => {
                // Para OCT, buscar si hay un movimiento OCT del tipo opuesto en la misma fecha
                if (mov.tipoMin.toUpperCase() === 'OCT') {
                    return todosMovimientos.some(m => {
                        const mismaFecha = m.fecha && mov.fecha &&
                            m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                            m.fecha.getMonth() === mov.fecha.getMonth() &&
                            m.fecha.getDate() === mov.fecha.getDate();
                        return mismaFecha &&
                               m.tipoMin.toUpperCase() === 'OCT' &&
                               m.tipoMov !== mov.tipoMov &&
                               m !== mov;
                    });
                }
                return false;
            };

            // Función para obtener la categoría y subcategoría de un movimiento
            const obtenerCategoria = (mov, todosMovimientos) => {
                const esIngreso = mov.tipoMov === 'I';
                const esEgreso = mov.tipoMov === 'E';
                const tienePataMismaFecha = tienePataPresenteMismaFecha(mov, todosMovimientos);
                const tienePataDistintaFecha = tienePataFuturaDistintaFecha(mov, todosMovimientos);
                const tieneOCTPataFuturoMismaFecha = tienePataFuturoMismaFecha(mov, todosMovimientos);
                const tipoMin = mov.tipoMin.toUpperCase();

                // A - Ingresos (Contados)
                // 1 - Ingreso
                if (esIngreso && (tipoMin === 'INGR' || tipoMin === 'ING')) {
                    return { categoria: 'A', subcategoria: 1, orden: 1 };
                }
                // 2 - Compra
                if (esIngreso && tipoMin === 'C') {
                    return { categoria: 'A', subcategoria: 2, orden: 2 };
                }

                // B - Ingresos Futuros (Patas futuro de movimientos anteriores y patas contado de movimientos que generan partida)
                if (esIngreso && !tienePataMismaFecha) {
                    // 1 - OCT Compra (QUE NO TENGA PATA PRESENTE EN MISMA FECHA)
                    if (tipoMin === 'OCT') {
                        return { categoria: 'B', subcategoria: 1, orden: 3 };
                    }
                    // 2 - PP (Ingreso/Pata futura) (QUE NO TENGA PATA PRESENTE EN MISMA FECHA)
                    if (tipoMin === 'PP') {
                        return { categoria: 'B', subcategoria: 2, orden: 4 };
                    }
                    // 3 - Préstamo (Ingreso/Pata futura) (QUE NO TENGA PATA PRESENTE EN MISMA FECHA)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET') {
                        return { categoria: 'B', subcategoria: 3, orden: 5 };
                    }
                    // 4 - PA (Ingreso/Pata contado)
                    if (tipoMin === 'PA') {
                        return { categoria: 'B', subcategoria: 4, orden: 6 };
                    }
                    // 5 - PF/PFT (Ingreso/Pata contado)
                    if (tipoMin === 'PF' || tipoMin === 'PFT') {
                        return { categoria: 'B', subcategoria: 5, orden: 7 };
                    }
                }

                // C - Transferencias de ingreso: (TRFU, TRFS, TRFC) Saldo, Custodia y Cuenta
                if (esIngreso && (tipoMin === 'TRFS' || tipoMin === 'TRFU' || tipoMin === 'TRFC')) {
                    return { categoria: 'C', subcategoria: 1, orden: 8 };
                }

                // D - Egresos Futuros (con pata futura misma fecha que pata contado)
                if (esEgreso && tienePataMismaFecha) {
                    // 1 - Préstamo (Egreso/Pata contado)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET') {
                        return { categoria: 'D', subcategoria: 1, orden: 9 };
                    }
                    // 2 - PP (Egreso/Pata contado)
                    if (tipoMin === 'PP') {
                        return { categoria: 'D', subcategoria: 2, orden: 10 };
                    }
                    // 3 - OCT (Egreso/Pata contado)
                    if (tipoMin === 'OCT') {
                        return { categoria: 'D', subcategoria: 3, orden: 11 };
                    }
                }

                // E - Ingresos Futuros (con pata contado misma fecha que pata futuro, para que se cancelen con los de arriba)
                if (esIngreso && tienePataMismaFecha) {
                    // 1 - Préstamo (Ingreso/Pata futura)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET') {
                        return { categoria: 'E', subcategoria: 1, orden: 12 };
                    }
                    // 2 - PP (Ingreso/Pata futura)
                    if (tipoMin === 'PP') {
                        return { categoria: 'E', subcategoria: 2, orden: 13 };
                    }
                    // 3 - OCT (Ingreso/Pata futura)
                    if (tipoMin === 'OCT') {
                        return { categoria: 'E', subcategoria: 3, orden: 14 };
                    }
                }

                // F - Demás movimientos que sean ingresos
                if (esIngreso) {
                    // Verificar que no haya sido clasificado en A, B, C o E
                    const yaClasificado = 
                        (tipoMin === 'INGR' || tipoMin === 'ING' || tipoMin === 'C') || // A
                        (!tienePataMismaFecha && (tipoMin === 'OCT' || tipoMin === 'PP' || tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PA' || tipoMin === 'PF' || tipoMin === 'PFT')) || // B
                        (tipoMin === 'TRFS' || tipoMin === 'TRFU' || tipoMin === 'TRFC') || // C (solo ingresos)
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PP' || tipoMin === 'OCT')); // E
                    
                    if (!yaClasificado) {
                        return { categoria: 'F', subcategoria: 1, orden: 15 };
                    }
                }

                // G - Egresos Futuros (Patas futuro de movimientos que generan partida y patas contado con pata futura a distinta fecha que pata contado)
                if (esEgreso && !tienePataMismaFecha) {
                    // 1 - Préstamo (Egreso/Pata contado)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET') {
                        return { categoria: 'G', subcategoria: 1, orden: 16 };
                    }
                    // 2 - PP (Egreso/Pata contado)
                    if (tipoMin === 'PP') {
                        return { categoria: 'G', subcategoria: 2, orden: 17 };
                    }
                    // 3 - OCT (Egreso/Pata contado) - solo si tiene pata futuro misma fecha (si no, va a J.3)
                    if (tipoMin === 'OCT' && tieneOCTPataFuturoMismaFecha) {
                        return { categoria: 'G', subcategoria: 3, orden: 18 };
                    }
                }

                // H - Partidas manuales
                if (tipoMin === 'PARTIDA' || tipoMin === 'PARTIDA_MANUAL' || tipoMin === 'PM') {
                    return { categoria: 'H', subcategoria: 1, orden: 19 };
                }

                // I - Bloqueos/Garantías
                if (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') {
                    // 1 - Ingreso garantías/bloqueos
                    if (esIngreso) {
                        return { categoria: 'I', subcategoria: 1, orden: 20 };
                    }
                    // 2 - Egreso garantías/bloqueos
                    if (esEgreso) {
                        return { categoria: 'I', subcategoria: 2, orden: 21 };
                    }
                }

                // J (G') - Egresos Futuros (Patas futuro de movimientos que generan partida y patas contado con pata futura a distinta fecha que pata contado)
                if (esEgreso && !tienePataMismaFecha) {
                    // 1 - PF/PFT (Egreso/Pata futuro)
                    if (tipoMin === 'PF' || tipoMin === 'PFT') {
                        return { categoria: 'J', subcategoria: 1, orden: 22 };
                    }
                    // 2 - PA (Egreso/Pata futuro)
                    if (tipoMin === 'PA') {
                        return { categoria: 'J', subcategoria: 2, orden: 23 };
                    }
                    // 3 - OCT Venta (QUE NO TENGA PATA FUTURO EN MISMA FECHA)
                    if (tipoMin === 'OCT' && !tieneOCTPataFuturoMismaFecha) {
                        return { categoria: 'J', subcategoria: 3, orden: 24 };
                    }
                }

                // K - Egresos (Contados)
                if (esEgreso) {
                    // Verificar que no haya sido clasificado en D, G, I o J
                    // Nota: C no se aplica aquí porque es solo para ingresos
                    const yaClasificadoEnDGJI = 
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PP' || tipoMin === 'OCT')) || // D
                        (!tienePataMismaFecha && ((tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PP') || (tipoMin === 'OCT' && tieneOCTPataFuturoMismaFecha))) || // G
                        (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') || // I
                        (!tienePataMismaFecha && (tipoMin === 'PF' || tipoMin === 'PFT' || tipoMin === 'PA' || (tipoMin === 'OCT' && !tieneOCTPataFuturoMismaFecha))); // J
                    
                    if (!yaClasificadoEnDGJI) {
                        // 1 - Venta
                        if (tipoMin === 'VENTA' || tipoMin === 'V') {
                            return { categoria: 'K', subcategoria: 1, orden: 25 };
                        }
                        // 2 - Transferencia (incluye TRFS, TRFU, TRFC para egresos, y TRANSFERENCIA genérica)
                        if (tipoMin === 'TRFS' || tipoMin === 'TRFU' || tipoMin === 'TRFC' || tipoMin === 'TRANSFERENCIA') {
                            return { categoria: 'K', subcategoria: 2, orden: 26 };
                        }
                        // 3 - Egreso
                        if (tipoMin === 'EGRESO' || tipoMin === 'EGR') {
                            return { categoria: 'K', subcategoria: 3, orden: 27 };
                        }
                    }
                }

                // L - Demás movimientos que sean egresos
                if (esEgreso) {
                    // Verificar que no haya sido clasificado en D, G, I, J o K
                    // Nota: C no se aplica aquí porque es solo para ingresos
                    const yaClasificadoEnDGJIK = 
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PP' || tipoMin === 'OCT')) || // D
                        (!tienePataMismaFecha && ((tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PRET' || tipoMin === 'PP') || (tipoMin === 'OCT' && tieneOCTPataFuturoMismaFecha))) || // G
                        (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') || // I
                        (!tienePataMismaFecha && (tipoMin === 'PF' || tipoMin === 'PFT' || tipoMin === 'PA' || (tipoMin === 'OCT' && !tieneOCTPataFuturoMismaFecha))) || // J
                        (tipoMin === 'VENTA' || tipoMin === 'V' || tipoMin === 'TRFS' || tipoMin === 'TRFU' || tipoMin === 'TRFC' || tipoMin === 'TRANSFERENCIA' || tipoMin === 'EGRESO' || tipoMin === 'EGR'); // K
                    
                    if (!yaClasificadoEnDGJIK) {
                        return { categoria: 'L', subcategoria: 1, orden: 28 };
                    }
                }

                // M - Imputaciones manuales
                if (tipoMin === 'IMPUTACION' || tipoMin === 'IMPUTACIÓN' || tipoMin === 'IMPUT' || tipoMin === 'IMPUT_MANUAL') {
                    return { categoria: 'M', subcategoria: 1, orden: 29 };
                }

                // Por defecto, mantener orden original
                return { categoria: 'Z', subcategoria: 999, orden: 999 };
            };

            // Ordenar movimientos según las nuevas reglas
            movimientos.sort((a, b) => {
                // Primero ordenar por fecha
                if (a.fecha.getTime() !== b.fecha.getTime()) {
                    return a.fecha.getTime() - b.fecha.getTime();
                }

                // REGLA ESPECIAL: Si ambos son PP en la misma fecha, los ingresos (I) tienen prioridad sobre los egresos (E)
                // EXCEPCIÓN: Si tienen pata presente misma fecha (mismo MINUTA_ORIGEN), entonces E va antes que I (categorías D y E)
                const ambosPP = a.tipoMin === 'PP' && b.tipoMin === 'PP';
                const mismaFecha = a.fecha.getTime() === b.fecha.getTime();
                
                if (ambosPP && mismaFecha) {
                    const catA = obtenerCategoria(a, movimientos);
                    const catB = obtenerCategoria(b, movimientos);
                    
                    // Si uno es categoría D (Egreso con pata) y el otro es categoría E (Ingreso con pata)
                    // y tienen el mismo MINUTA_ORIGEN, entonces E va antes que I (para crear distribución primero)
                    if (catA.categoria === 'D' && catB.categoria === 'E' && a.minutaOrigen === b.minutaOrigen) {
                        return -1; // E antes que I
                    }
                    if (catA.categoria === 'E' && catB.categoria === 'D' && a.minutaOrigen === b.minutaOrigen) {
                        return 1; // I después que E
                    }
                    
                    // Para todos los demás casos de PP en la misma fecha, I tiene PRIORIDAD sobre E
                    // Esto asegura que los ingresos PP se procesen primero para crear saldo disponible
                    if (a.tipoMov === 'I' && b.tipoMov === 'E') {
                        return -1; // I antes que E
                    }
                    if (a.tipoMov === 'E' && b.tipoMov === 'I') {
                        return 1; // E después que I
                    }
                }

                // Si misma fecha, obtener categorías
                const catA = obtenerCategoria(a, movimientos);
                const catB = obtenerCategoria(b, movimientos);

                // Comparar por orden numérico (más bajo = primero)
                if (catA.orden !== catB.orden) {
                    return catA.orden - catB.orden;
                }

                // Si misma categoría, ordenar por subcategoría
                if (catA.subcategoria !== catB.subcategoria) {
                    return catA.subcategoria - catB.subcategoria;
                }

                // Si misma categoría y subcategoría, mantener orden original del Excel
                return a.index - b.index;
            });
            
            // Validar que todos los movimientos hayan sido mapeados correctamente
            const movimientosSinMapear = [];
            movimientos.forEach(mov => {
                const categoria = obtenerCategoria(mov, movimientos);
                if (categoria.categoria === 'Z' && categoria.orden === 999) {
                    movimientosSinMapear.push({
                        tipoMin: mov.tipoMin,
                        tipoMov: mov.tipoMov,
                        minutaOrigen: mov.minutaOrigen,
                        cantidad: mov.cantidad,
                        fecha: mov.fechaStr,
                        index: mov.index
                    });
                }
            });
            
            if (movimientosSinMapear.length > 0) {
                const erroresDetalle = movimientosSinMapear.map(m => 
                    `TIPO_MIN: "${m.tipoMin}" | TIPO_MOV: "${m.tipoMov}" | MINUTA_ORIGEN: "${m.minutaOrigen}" | CANTIDAD: ${m.cantidad} | FECHA: ${m.fecha}`
                ).join('\n');
                
                return res.status(400).json({
                    success: false,
                    error: `No se pudo mapear ${movimientosSinMapear.length} movimiento(s). El sistema no reconoce el tipo de minuta especificado.`,
                    detalles: `Movimientos sin mapear:\n${erroresDetalle}`,
                    movimientosSinMapear: movimientosSinMapear
                });
            }
            
            // Procesar con lógica FIFO
            const resultado = procesarFIFO(movimientos);

            // Calcular sumatoria de saldos de todas las partidas (tenencia total)
            const sumatoriaSaldos = resultado.partidas.reduce((sum, partida) => sum + partida.saldo, 0);

            res.json({
                success: true,
                partidas: resultado.partidas,
                errores: resultado.errores,
                totalMovimientos: movimientos.length,
                totalPartidas: resultado.partidas.length,
                sumatoriaSaldos: sumatoriaSaldos
            });

        } catch (error) {
            console.error('Error al procesar inventario:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al procesar el archivo Excel'
            });
        }
    }
};

/**
 * Procesa los movimientos aplicando lógica FIFO
 */
function procesarFIFO(movimientos) {
    const { calcularSaldoDisponible, calcularSaldoInicialDia, obtenerPartidasDisponibles, crearImputacion } = require('./inventarioUtils');
    const { procesarIngresoPP, procesarEgresoPP } = require('./inventarioPPProcessor');
    
    const partidas = [];
    const errores = [];
    let partidaIdCounter = 1;
    let indiceUltimoProcesado = -1;
    
    // Almacenar distribuciones de egresos PP por MINUTA_ORIGEN
    const distribucionesPP = {};
    
    // Almacenar egresos PP que ya fueron procesados retroactivamente
    const egresosPPProcesadosRetroactivamente = new Set();
    
    // Almacenar ingresos PP que ya fueron procesados retroactivamente
    const ingresosPPProcesadosRetroactivamente = new Set();

    let fechaAnterior = null;

    for (let i = 0; i < movimientos.length; i++) {
        const mov = movimientos[i];
        try {
            // Si ya hay un error, detener el procesamiento
            if (errores.length > 0) {
                break;
            }
            
            indiceUltimoProcesado = i;

            // Detectar cambio de día y mostrar saldo inicial del día
            const fechaActual = mov.fecha ? 
                `${mov.fecha.getFullYear()}-${String(mov.fecha.getMonth() + 1).padStart(2, '0')}-${String(mov.fecha.getDate()).padStart(2, '0')}` : 
                null;
            
            if (fechaActual && fechaActual !== fechaAnterior) {
                // Calcular saldo inicial del día (suma de todas las partidas disponibles al inicio del día)
                // Al inicio del día, el saldo actual de las partidas es el saldo inicial (aún no se han procesado movimientos del día)
                const inicioDia = new Date(mov.fecha.getFullYear(), mov.fecha.getMonth(), mov.fecha.getDate());
                const saldoInicialDia = partidas
                    .filter(p => {
                        if (p.saldo <= 0 || p.tipoMin === 'PA') return false;
                        if (!p.fecha) return false;
                        // Partidas creadas antes del inicio del día actual
                        return p.fecha.getTime() < inicioDia.getTime();
                    })
                    .reduce((sum, p) => {
                        // Al inicio del día, el saldo actual es el saldo inicial (aún no hay imputaciones del día)
                        // Pero por si acaso, revertimos cualquier imputación del día actual que pueda existir
                        const imputacionesDelDia = p.imputaciones.filter(imp => {
                            if (!imp.fecha || !mov.fecha) return false;
                            return imp.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                   imp.fecha.getMonth() === mov.fecha.getMonth() &&
                                   imp.fecha.getDate() === mov.fecha.getDate();
                        });
                        
                        if (imputacionesDelDia.length > 0) {
                            // Revertir imputaciones del día para obtener el saldo inicial
                            const saldoInicial = p.saldo - imputacionesDelDia
                                .filter(imp => imp.cantidad > 0) // Ingresos aumentan el saldo, revertir restando
                                .reduce((s, imp) => s + imp.cantidad, 0) +
                                imputacionesDelDia
                                .filter(imp => imp.cantidad < 0) // Egresos reducen el saldo, revertir sumando
                                .reduce((s, imp) => s - imp.cantidad, 0);
                            return sum + saldoInicial;
                        }
                        // No hay imputaciones del día, el saldo actual es el inicial
                        return sum + p.saldo;
                    }, 0);
                
                const cantidadPartidas = partidas.filter(p => {
                    if (p.saldo <= 0 || p.tipoMin === 'PA') return false;
                    if (!p.fecha) return false;
                    const inicioDia = new Date(mov.fecha.getFullYear(), mov.fecha.getMonth(), mov.fecha.getDate());
                    return p.fecha.getTime() < inicioDia.getTime();
                }).length;
                
                // Si había un día anterior, mostrar su saldo final con resumen de movimientos
                if (fechaAnterior !== null) {
                    const saldoFinalDiaAnterior = calcularSaldoDisponible(partidas);
                    const fechaAnteriorStr = movimientos.find(m => {
                        if (!m.fecha) return false;
                        const fechaM = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}-${String(m.fecha.getDate()).padStart(2, '0')}`;
                        return fechaM === fechaAnterior;
                    })?.fechaStr || fechaAnterior;
                    
                    // Calcular totales de ingresos y egresos del día anterior
                    const movimientosDiaAnterior = movimientos.filter(m => {
                        if (!m.fecha) return false;
                        const fechaM = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}-${String(m.fecha.getDate()).padStart(2, '0')}`;
                        return fechaM === fechaAnterior;
                    });
                    
                    const totalIngresosDia = movimientosDiaAnterior
                        .filter(m => m.tipoMov === 'I')
                        .reduce((sum, m) => sum + m.cantidad, 0);
                    
                    const totalEgresosDia = movimientosDiaAnterior
                        .filter(m => m.tipoMov === 'E')
                        .reduce((sum, m) => sum + m.cantidad, 0);
                    
                }
                
                fechaAnterior = fechaActual;
            }


            if (mov.tipoMov === 'I') {
                // INGRESO: Crear nueva partida
                if (['TRFU', 'C', 'ING', 'INGR', 'PA'].includes(mov.tipoMin)) {
                    const partida = {
                        id: partidaIdCounter++,
                        tipoMin: mov.tipoMin,
                        tipoMov: mov.tipoMov,
                        minutaOrigen: mov.minutaOrigen,
                        fecha: mov.fecha,
                        fechaStr: mov.fechaStr,
                        cantidadInicial: mov.cantidad,
                        saldo: mov.cantidad,
                        cerrada: false, // Las partidas se crean abiertas
                        imputaciones: []
                    };
                    partidas.push(partida);
                    
                    // Si es una partida que no es PA, verificar si hay imputaciones pendientes x PA para aplicar
                    if (mov.tipoMin !== 'PA') {
                        // Buscar todas las imputaciones pendientes x PA en todas las partidas PA
                        for (const partidaPA of partidas.filter(p => p.tipoMin === 'PA')) {
                            // Buscar imputaciones pendientes x PA que aún no han sido resueltas
                            const imputacionesPendientes = partidaPA.imputaciones.filter(imp => 
                                (imp.pendiente === true || imp.pendienteXPA === true) && 
                                !imp.resuelta && 
                                imp.cantidad < 0 // Solo egresos pendientes
                            );
                            
                            // Aplicar imputaciones pendientes contra la nueva partida
                            for (const impPendiente of imputacionesPendientes) {
                                if (partida.saldo <= 0) break; // No hay más saldo en la nueva partida
                                
                                const cantidadPendiente = Math.abs(impPendiente.cantidad);
                                const cantidadAplicar = Math.min(partida.saldo, cantidadPendiente);
                                
                                if (cantidadAplicar > 0) {
                                    // Reducir el saldo de la nueva partida
                                    partida.saldo -= cantidadAplicar;
                                    
                                    // Crear imputación en la nueva partida para el egreso pendiente
                                    partida.imputaciones.push({
                                        tipoMin: impPendiente.tipoMin,
                                        tipoMov: impPendiente.tipoMov,
                                        minutaOrigen: impPendiente.minutaOrigen,
                                        fecha: impPendiente.fecha,
                                        fechaStr: impPendiente.fechaStr,
                                        cantidad: -cantidadAplicar,
                                        cantidadOriginal: impPendiente.cantidadOriginal,
                                        saldoDespues: partida.saldo,
                                        resueltaDesdePendienteXPA: true, // Marca que fue resuelta desde una pendiente x PA
                                        partidaPAOrigen: partidaPA.id // Referencia a la partida PA de origen
                                    });
                                    
                                    // Actualizar la imputación pendiente en la partida PA
                                    // Si se aplicó completamente, marcarla como resuelta
                                    if (cantidadAplicar >= cantidadPendiente) {
                                        impPendiente.resuelta = true;
                                        impPendiente.partidaResolucion = partida.id;
                                        impPendiente.fechaResolucion = mov.fecha;
                                        impPendiente.fechaResolucionStr = mov.fechaStr;
                                    } else {
                                        // Si solo se aplicó parcialmente, crear una nueva imputación pendiente con el resto
                                        const cantidadRestante = cantidadPendiente - cantidadAplicar;
                                        partidaPA.imputaciones.push({
                                            tipoMin: impPendiente.tipoMin,
                                            tipoMov: impPendiente.tipoMov,
                                            minutaOrigen: impPendiente.minutaOrigen,
                                            fecha: impPendiente.fecha,
                                            fechaStr: impPendiente.fechaStr,
                                            cantidad: -cantidadRestante,
                                            cantidadOriginal: impPendiente.cantidadOriginal,
                                            saldoDespues: partidaPA.saldo,
                                            pendiente: true,
                                            pendienteXPA: true
                                        });
                                        
                                        // Marcar la original como resuelta parcialmente
                                        impPendiente.resuelta = true;
                                        impPendiente.resueltaParcial = true;
                                        impPendiente.cantidadResuelta = cantidadAplicar;
                                        impPendiente.partidaResolucion = partida.id;
                                        impPendiente.fechaResolucion = mov.fecha;
                                        impPendiente.fechaResolucionStr = mov.fechaStr;
                                    }
                                    
                                    // Si el saldo llegó a 0, cerrar la partida
                                    if (partida.saldo === 0) {
                                        partida.cerrada = true;
                                    }
                                }
                            }
                        }
                    }
                } else if (mov.tipoMin === 'PP') {
                    // Procesar ingreso PP usando función auxiliar
                    const resultado = procesarIngresoPP(
                        mov, movimientos, partidas, distribucionesPP,
                        egresosPPProcesadosRetroactivamente,
                        ingresosPPProcesadosRetroactivamente,
                        partidaIdCounter, errores
                    );
                    
                    if (resultado.error) {
                        break;
                    }
                    if (resultado.saltado) {
                        continue;
                    }
                }
            } else if (mov.tipoMov === 'E') {
                // EGRESO: Aplicar FIFO
                let cantidadRestante = mov.cantidad;

                // Si es PA, solo puede impactar en partidas PA con mismo MINUTA_ORIGEN
                if (mov.tipoMin === 'PA') {
                    const partidaPA = partidas.find(p => 
                        p.tipoMin === 'PA' && 
                        p.minutaOrigen === mov.minutaOrigen && 
                        p.saldo > 0
                    );

                    if (!partidaPA) {
                        errores.push({
                            movimiento: mov,
                            mensaje: `No existe partida PA con MINUTA_ORIGEN ${mov.minutaOrigen} con saldo disponible`
                        });
                        break; // Detener procesamiento al primer error
                    }

                    if (partidaPA.saldo < cantidadRestante) {
                        errores.push({
                            movimiento: mov,
                            mensaje: `La partida PA ${partidaPA.id} no tiene saldo suficiente. Saldo: ${partidaPA.saldo}, Requerido: ${cantidadRestante}`
                        });
                        break; // Detener procesamiento al primer error
                    }

                    partidaPA.saldo -= cantidadRestante;
                    partidaPA.imputaciones.push({
                        tipoMin: mov.tipoMin,
                        tipoMov: mov.tipoMov,
                        minutaOrigen: mov.minutaOrigen,
                        fecha: mov.fecha,
                        fechaStr: mov.fechaStr,
                        cantidad: -cantidadRestante,
                        cantidadOriginal: mov.cantidad,
                        saldoDespues: partidaPA.saldo
                    });
                    cantidadRestante = 0;
                } else if (mov.tipoMin === 'PP') {
                    // Procesar egreso PP usando función auxiliar
                    const resultado = procesarEgresoPP(
                        mov, movimientos, partidas, distribucionesPP,
                        egresosPPProcesadosRetroactivamente,
                        ingresosPPProcesadosRetroactivamente,
                        partidaIdCounter, i, errores
                    );
                    
                    if (resultado.error) {
                        break;
                    }
                    if (resultado.saltado) {
                        continue;
                    }
                    
                    
                } else {
                    // Para otros tipos (TRFU, C, ING, etc.), aplicar FIFO (primero las partidas más antiguas)
                    // IMPORTANTE: Estos egresos SÍ cierran partidas cuando el saldo llega a 0
                    // PERO: Permitir usar partidas cerradas si tienen saldo > 0 (pueden haber sido cerradas por otros egresos del mismo día)
                    const partidasOrdenadas = partidas
                        .filter(p => {
                            // Excluir partidas PA (solo se impactan con egresos PA)
                            if (p.tipoMin === 'PA') return false;
                            // Incluir partidas con saldo > 0, incluso si están cerradas
                            // porque pueden haber sido cerradas por otros egresos del mismo día
                            return p.saldo > 0;
                        })
                        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

                    for (const partida of partidasOrdenadas) {
                        if (cantidadRestante <= 0) break;

                        const cantidadAplicar = Math.min(partida.saldo, cantidadRestante);
                        partida.saldo -= cantidadAplicar;
                        cantidadRestante -= cantidadAplicar;

                        partida.imputaciones.push({
                            tipoMin: mov.tipoMin,
                            tipoMov: mov.tipoMov,
                            minutaOrigen: mov.minutaOrigen,
                            fecha: mov.fecha,
                            fechaStr: mov.fechaStr,
                            cantidad: -cantidadAplicar,
                            cantidadOriginal: mov.cantidad,
                            saldoDespues: partida.saldo
                        });
                        
                        // Si el saldo llegó a 0, cerrar la partida (solo para egresos NO-PP)
                        // Si ya estaba cerrada, mantenerla cerrada
                        if (partida.saldo === 0) {
                            partida.cerrada = true;
                        }
                    }

                    if (cantidadRestante > 0) {
                        // Calcular saldo total disponible (no-PA) para el mensaje de error
                        const saldoTotalDisponible = partidas
                            .filter(p => p.tipoMin !== 'PA' && p.saldo > 0)
                            .reduce((sum, p) => sum + p.saldo, 0);
                        
                        // Verificar si hay saldo disponible en partidas PA
                        const partidasPADisponibles = partidas
                            .filter(p => p.tipoMin === 'PA' && p.saldo > 0)
                            .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                        
                        const saldoPADisponible = partidasPADisponibles.reduce((sum, p) => sum + p.saldo, 0);
                        
                        // Si hay saldo PA disponible, crear imputación pendiente x PA en lugar de error
                        if (saldoPADisponible > 0 && cantidadRestante <= saldoPADisponible) {
                            // Crear imputación pendiente x PA en la primera partida PA disponible
                            const partidaPA = partidasPADisponibles[0];
                            const cantidadPendiente = cantidadRestante;
                            
                            // Crear imputación pendiente (no reduce el saldo del PA, solo queda registrada como pendiente)
                            partidaPA.imputaciones.push({
                                tipoMin: mov.tipoMin,
                                tipoMov: mov.tipoMov,
                                minutaOrigen: mov.minutaOrigen,
                                fecha: mov.fecha,
                                fechaStr: mov.fechaStr,
                                cantidad: -cantidadPendiente,
                                cantidadOriginal: mov.cantidad,
                                saldoDespues: partidaPA.saldo, // El saldo del PA no cambia
                                pendiente: true, // Marca especial para indicar que es pendiente x PA
                                pendienteXPA: true // Marca adicional para identificar imputaciones pendientes x PA
                            });
                            
                            // No generar error, continuar procesamiento
                            cantidadRestante = 0;
                        } else {
                            // No hay suficiente saldo ni en partidas no-PA ni en PA, generar error
                            errores.push({
                                movimiento: mov,
                                mensaje: `No hay suficiente saldo en las partidas para cubrir el egreso. Requerido: ${mov.cantidad}, Disponible: ${saldoTotalDisponible}, Faltante: ${cantidadRestante}`
                            });
                            break; // Detener procesamiento al primer error
                        }
                    }
                    
                }
            }
        } catch (error) {
            errores.push({
                movimiento: mov,
                mensaje: `Error al procesar movimiento: ${error.message}`
            });
            break; // Detener procesamiento al primer error
        }
    }

    // Si hay errores, agregar información sobre movimientos pendientes del día
    if (errores.length > 0 && indiceUltimoProcesado >= 0) {
        const movimientoConError = errores[0].movimiento;
        const fechaError = movimientoConError.fecha;
        
        // Buscar todos los movimientos de la misma fecha que quedaron pendientes
        const movimientosPendientes = movimientos
            .slice(indiceUltimoProcesado + 1) // Movimientos después del que causó el error
            .filter(mov => {
                // Comparar fechas (solo día, mes y año, sin hora)
                return mov.fecha && fechaError &&
                       mov.fecha.getFullYear() === fechaError.getFullYear() &&
                       mov.fecha.getMonth() === fechaError.getMonth() &&
                       mov.fecha.getDate() === fechaError.getDate();
            })
            .filter(mov => {
                // Filtrar movimientos que ya fueron procesados (tienen imputaciones en las partidas)
                const fueProcesado = partidas.some(partida => 
                    partida.imputaciones && partida.imputaciones.some(imp => 
                        imp.tipoMin === mov.tipoMin &&
                        imp.tipoMov === mov.tipoMov &&
                        imp.minutaOrigen === mov.minutaOrigen &&
                        imp.fechaStr === mov.fechaStr
                    )
                );
                return !fueProcesado; // Solo incluir movimientos que NO fueron procesados
            });
        
        // Agregar información de movimientos pendientes al error
        if (movimientosPendientes.length > 0) {
            errores[0].movimientosPendientes = movimientosPendientes.map(mov => ({
                tipoMin: mov.tipoMin,
                tipoMov: mov.tipoMov,
                minutaOrigen: mov.minutaOrigen,
                cantidad: mov.cantidad,
                fecha: mov.fechaStr
            }));
            
            // Agregar información de pendientes al error (el mensaje se mantiene, los pendientes se muestran en el frontend)
            // No modificamos el mensaje aquí, solo agregamos la información que el frontend mostrará
        }
    }

    // Mostrar saldo final del último día procesado con resumen
    if (fechaAnterior !== null && movimientos.length > 0) {
        const ultimoMovimiento = movimientos[indiceUltimoProcesado >= 0 ? indiceUltimoProcesado : movimientos.length - 1];
        if (ultimoMovimiento && ultimoMovimiento.fecha) {
            const saldoFinal = partidas
                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                .reduce((sum, p) => sum + p.saldo, 0);
            
            // Calcular totales de ingresos y egresos del último día
            const fechaUltimoDia = `${ultimoMovimiento.fecha.getFullYear()}-${String(ultimoMovimiento.fecha.getMonth() + 1).padStart(2, '0')}-${String(ultimoMovimiento.fecha.getDate()).padStart(2, '0')}`;
            const movimientosUltimoDia = movimientos.filter(m => {
                if (!m.fecha) return false;
                const fechaM = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, '0')}-${String(m.fecha.getDate()).padStart(2, '0')}`;
                return fechaM === fechaUltimoDia;
            });
            
            const totalIngresosUltimoDia = movimientosUltimoDia
                .filter(m => m.tipoMov === 'I')
                .reduce((sum, m) => sum + m.cantidad, 0);
            
            const totalEgresosUltimoDia = movimientosUltimoDia
                .filter(m => m.tipoMov === 'E')
                .reduce((sum, m) => sum + m.cantidad, 0);
            
            // Calcular saldo total incluyendo partidas con saldo negativo o 0 para diagnóstico
            const saldoTotalIncluyendoNegativos = partidas
                .filter(p => p.tipoMin !== 'PA')
                .reduce((sum, p) => sum + p.saldo, 0);
            
            // Calcular saldo esperado matemáticamente
            // El saldo inicial del día debe ser el saldo de las partidas creadas ANTES del día actual
            // Pero debemos calcular el saldo ORIGINAL de esas partidas (antes de cualquier imputación del día)
            const saldoInicialUltimoDia = partidas
                .filter(p => {
                    if (p.tipoMin === 'PA') return false;
                    if (!p.fecha || !ultimoMovimiento.fecha) return false;
                    return p.fecha.getTime() < new Date(ultimoMovimiento.fecha.getFullYear(), ultimoMovimiento.fecha.getMonth(), ultimoMovimiento.fecha.getDate()).getTime();
                })
                .reduce((sum, p) => {
                    // Calcular saldo original de la partida (antes de cualquier imputación del día)
                    const imputacionesDelDia = p.imputaciones.filter(imp => {
                        if (!imp.fecha || !ultimoMovimiento.fecha) return false;
                        return imp.fecha.getFullYear() === ultimoMovimiento.fecha.getFullYear() &&
                               imp.fecha.getMonth() === ultimoMovimiento.fecha.getMonth() &&
                               imp.fecha.getDate() === ultimoMovimiento.fecha.getDate();
                    });
                    const saldoOriginal = p.saldo - imputacionesDelDia.reduce((s, imp) => s + imp.cantidad, 0);
                    return sum + saldoOriginal;
                }, 0);
            
            const saldoEsperado = saldoInicialUltimoDia + totalIngresosUltimoDia - totalEgresosUltimoDia;
            const diferencia = saldoFinal - saldoEsperado;
            
            // Listar todas las partidas con su saldo para diagnóstico
            const partidasConSaldo = partidas
                .filter(p => p.tipoMin !== 'PA')
                .map(p => ({
                    id: p.id,
                    tipoMin: p.tipoMin,
                    saldo: p.saldo,
                    fecha: p.fechaStr
                }))
                .sort((a, b) => b.saldo - a.saldo);
            
            const partidasNegativas = partidasConSaldo.filter(p => p.saldo < 0);
            const partidasCero = partidasConSaldo.filter(p => p.saldo === 0);
            const partidasPositivas = partidasConSaldo.filter(p => p.saldo > 0);
            
            const sumaPartidasNegativas = partidasNegativas.reduce((sum, p) => sum + p.saldo, 0);
            const sumaPartidasPositivas = partidasPositivas.reduce((sum, p) => sum + p.saldo, 0);
            
        }
    }

    return { partidas, errores };
}

module.exports = inventarioController;

