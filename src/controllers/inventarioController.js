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

            // Procesar y ordenar los datos
            const movimientos = datos
                .map((row, index) => {
                    // Limpiar y normalizar todos los campos, eliminando espacios en blanco
                    const tipoMin = row.TIPO_MIN ? String(row.TIPO_MIN).trim() : '';
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
                    return mov.tipoMin && 
                           mov.tipoMov && 
                           mov.fecha && 
                           !isNaN(mov.cantidad) && 
                           mov.cantidad !== 0;
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
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST') {
                        return { categoria: 'B', subcategoria: 3, orden: 5 };
                    }
                    // 4 - PA (Ingreso/Pata contado)
                    if (tipoMin === 'PA') {
                        return { categoria: 'B', subcategoria: 4, orden: 6 };
                    }
                    // 5 - PF (Ingreso/Pata contado)
                    if (tipoMin === 'PF') {
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
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST') {
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
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST') {
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
                        (!tienePataMismaFecha && (tipoMin === 'OCT' || tipoMin === 'PP' || tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PA' || tipoMin === 'PF')) || // B
                        (tipoMin === 'TRFS' || tipoMin === 'TRFU' || tipoMin === 'TRFC') || // C (solo ingresos)
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')); // E
                    
                    if (!yaClasificado) {
                        return { categoria: 'F', subcategoria: 1, orden: 15 };
                    }
                }

                // G - Egresos Futuros (Patas futuro de movimientos que generan partida y patas contado con pata futura a distinta fecha que pata contado)
                if (esEgreso && !tienePataMismaFecha) {
                    // 1 - Préstamo (Egreso/Pata contado)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST') {
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
                    // 1 - PF (Egreso/Pata futuro)
                    if (tipoMin === 'PF') {
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
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')) || // D
                        (!tienePataMismaFecha && ((tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP') || (tipoMin === 'OCT' && tieneOCTPataFuturoMismaFecha))) || // G
                        (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') || // I
                        (!tienePataMismaFecha && (tipoMin === 'PF' || tipoMin === 'PA' || (tipoMin === 'OCT' && !tieneOCTPataFuturoMismaFecha))); // J
                    
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
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')) || // D
                        (!tienePataMismaFecha && ((tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP') || (tipoMin === 'OCT' && tieneOCTPataFuturoMismaFecha))) || // G
                        (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') || // I
                        (!tienePataMismaFecha && (tipoMin === 'PF' || tipoMin === 'PA' || (tipoMin === 'OCT' && !tieneOCTPataFuturoMismaFecha))) || // J
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

            // Log del orden de movimientos antes de procesar
            console.log('[ORDENAMIENTO] Total movimientos:', movimientos.length);
            console.log('[ORDENAMIENTO] Primeros 20 movimientos:');
            movimientos.slice(0, 20).forEach((mov, idx) => {
                console.log(`  ${idx + 1}. ${mov.tipoMin} | ${mov.tipoMov} | ${mov.minutaOrigen} | ${mov.cantidad} | ${mov.fechaStr}`);
            });
            
            // Verificar ordenamiento específico para PP: buscar pares E/I con mismo MINUTA_ORIGEN
            console.log('[ORDENAMIENTO] Verificando pares PP E/I con mismo MINUTA_ORIGEN:');
            const paresPP = {};
            movimientos.forEach((mov, idx) => {
                if (mov.tipoMin === 'PP') {
                    const key = `${mov.fechaStr}_${mov.minutaOrigen}`;
                    if (!paresPP[key]) {
                        paresPP[key] = { E: null, I: null, indices: { E: -1, I: -1 } };
                    }
                    if (mov.tipoMov === 'E') {
                        paresPP[key].E = mov;
                        paresPP[key].indices.E = idx;
                    } else if (mov.tipoMov === 'I') {
                        paresPP[key].I = mov;
                        paresPP[key].indices.I = idx;
                    }
                }
            });
            
            Object.keys(paresPP).forEach(key => {
                const par = paresPP[key];
                if (par.E && par.I) {
                    const ordenCorrecto = par.indices.E < par.indices.I;
                    console.log(`  ${key}: E (índice ${par.indices.E}) ${ordenCorrecto ? '✅' : '❌'} I (índice ${par.indices.I})`);
                    if (!ordenCorrecto) {
                        console.log(`    ⚠️ ERROR: El I se procesa antes que el E para ${key}`);
                    }
                }
            });
            
            // Procesar con lógica FIFO
            const resultado = procesarFIFO(movimientos);

            res.json({
                success: true,
                partidas: resultado.partidas,
                errores: resultado.errores,
                totalMovimientos: movimientos.length,
                totalPartidas: resultado.partidas.length
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
    const partidas = [];
    const errores = [];
    let partidaIdCounter = 1;
    let indiceUltimoProcesado = -1; // Para saber qué movimientos quedaron pendientes
    
    // Almacenar distribuciones de egresos PP por MINUTA_ORIGEN
    // Estructura: { minutaOrigen: [{ partidaId: X, cantidad: Y }, ...] }
    const distribucionesPP = {};
    
    // Almacenar movimientos procesados por fecha y MINUTA_ORIGEN para búsqueda posterior
    const movimientosPorFechaYMinuta = {};
    
    // Almacenar egresos PP que ya fueron procesados retroactivamente (desde un ingreso PP)
    // para evitar procesarlos dos veces
    const egresosPPProcesadosRetroactivamente = new Set();
    
    // Almacenar ingresos PP que ya fueron procesados retroactivamente (cuando se procesó su egreso PP primero)
    // para evitar procesarlos dos veces
    const ingresosPPProcesadosRetroactivamente = new Set();
    
    // Función auxiliar para formatear números con separador de miles
    const formatearNumero = (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

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
                    const saldoFinalDiaAnterior = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
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
                    
                    console.log(`[FIN DÍA] ${fechaAnteriorStr} - Saldo final disponible: ${saldoFinalDiaAnterior.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Ingresos: ${totalIngresosDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Egresos: ${totalEgresosDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
                }
                
                console.log(`\n[INICIO DÍA] ${mov.fechaStr} - Saldo inicial disponible: ${saldoInicialDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${cantidadPartidas} partida(s))`);
                fechaAnterior = fechaActual;
            }

            // Log de saldo después de cada egreso para rastrear discrepancias
            if (mov.tipoMov === 'E') {
                const saldoActual = partidas
                    .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                    .reduce((sum, p) => sum + p.saldo, 0);
                console.log(`[EGRESO] ${mov.tipoMin} | ${mov.minutaOrigen} | ${mov.cantidad.toLocaleString('es-AR')} | Saldo después: ${saldoActual.toLocaleString('es-AR')}`);
            }

            if (mov.tipoMov === 'I') {
                // INGRESO: Crear nueva partida
                if (['TRFU', 'C', 'ING', 'PA'].includes(mov.tipoMin)) {
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
                    
                    // Log de ingreso (no PP)
                    const saldoDespuesIngreso = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    console.log(`[INGRESO] ${mov.tipoMin} | ${mov.minutaOrigen} | ${mov.cantidad.toLocaleString('es-AR')} | Saldo después: ${saldoDespuesIngreso.toLocaleString('es-AR')}`);
                } else if (mov.tipoMin === 'PP') {
                    // PP como INGRESO: debe matchear con el egreso PP del mismo MINUTA_ORIGEN
                    // NUEVA LÓGICA SIMPLIFICADA: NO procesar retroactivamente ingresos PP
                    // Solo procesar cuando lleguen a su posición normal en el orden
                    
                    // Si este ingreso PP ya fue procesado retroactivamente, saltarlo
                    if (ingresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
                        const distribucionExistente = distribucionesPP[mov.minutaOrigen];
                        if (!distribucionExistente || distribucionExistente.length === 0) {
                            errores.push({
                                movimiento: mov,
                                mensaje: `El ingreso PP ${mov.minutaOrigen} fue procesado retroactivamente pero no se encontró su distribución guardada`
                            });
                            break;
                        }
                        const saldoActual = partidas
                            .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                            .reduce((sum, p) => sum + p.saldo, 0);
                        console.log(`[INGRESO PP] ${mov.minutaOrigen} | Ya procesado retroactivamente, saltando | Saldo: ${saldoActual.toLocaleString('es-AR')}`);
                        delete distribucionesPP[mov.minutaOrigen];
                        continue;
                    }
                    
                    let distribucion = distribucionesPP[mov.minutaOrigen];
                    
                    if (!distribucion || distribucion.length === 0) {
                        // Buscar el egreso PP correspondiente en movimientos ANTERIORES
                        const indiceActual = movimientos.indexOf(mov);
                        const egresoPPAnterior = movimientos.slice(0, indiceActual).find(m => {
                            return m.tipoMin === 'PP' && 
                                   m.tipoMov === 'E' && 
                                   m.minutaOrigen === mov.minutaOrigen;
                        });
                        
                        let egresoPP = egresoPPAnterior;
                        
                        // Si no se encuentra en movimientos anteriores, buscar si hay un egreso PP pendiente del mismo día
                        if (!egresoPP) {
                            const egresoPPDelMismoDia = movimientos.find(m => {
                                const mismaFecha = m.fecha && mov.fecha &&
                                    m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                    m.fecha.getMonth() === mov.fecha.getMonth() &&
                                    m.fecha.getDate() === mov.fecha.getDate();
                                const esPPEgreso = m.tipoMin === 'PP' && m.tipoMov === 'E';
                                const mismoMinutaOrigen = m.minutaOrigen === mov.minutaOrigen;
                                const noEsElMismo = m !== mov;
                                const despuesDelActual = movimientos.indexOf(m) > indiceActual;
                                
                                return mismaFecha && esPPEgreso && mismoMinutaOrigen && noEsElMismo && despuesDelActual;
                            });
                            
                            if (egresoPPDelMismoDia) {
                                // Hay un egreso PP pendiente del mismo día, procesarlo primero
                                egresoPP = egresoPPDelMismoDia;
                                // Marcar el egreso PP como procesado retroactivamente para evitar procesarlo dos veces
                                egresosPPProcesadosRetroactivamente.add(egresoPP.minutaOrigen);
                            }
                        }
                        
                        if (egresoPP) {
                            // Procesar el egreso PP encontrado
                            let cantidadRestanteEgreso = egresoPP.cantidad;
                            
                            const partidasDisponibles = partidas
                                .filter(p => {
                                    if (p.tipoMin === 'PA') return false;
                                    return p.saldo > 0;
                                })
                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                            
                            const distribucionNueva = [];
                            
                            for (const partida of partidasDisponibles) {
                                if (cantidadRestanteEgreso <= 0) break;
                                
                                const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgreso);
                                partida.saldo -= cantidadAplicar;
                                cantidadRestanteEgreso -= cantidadAplicar;
                                
                                partida.imputaciones.push({
                                    tipoMin: egresoPP.tipoMin,
                                    tipoMov: egresoPP.tipoMov,
                                    minutaOrigen: egresoPP.minutaOrigen,
                                    fecha: egresoPP.fecha,
                                    fechaStr: egresoPP.fechaStr,
                                    cantidad: -cantidadAplicar,
                                    cantidadOriginal: egresoPP.cantidad,
                                    saldoDespues: partida.saldo
                                });
                                
                                distribucionNueva.push({
                                    partidaId: partida.id,
                                    cantidad: cantidadAplicar
                                });
                            }
                            
                            if (cantidadRestanteEgreso > 0) {
                                // Si no hay suficiente saldo, generar error
                                errores.push({
                                    movimiento: mov,
                                    mensaje: `No hay suficiente saldo para procesar el egreso PP. Faltante: ${cantidadRestanteEgreso}. MINUTA_ORIGEN: ${egresoPP.minutaOrigen}`
                                });
                                break;
                            }
                            
                            // Guardar la distribución y usarla para el ingreso
                            distribucionesPP[mov.minutaOrigen] = distribucionNueva;
                            distribucion = distribucionNueva;
                            
                            // Si el egreso PP es del mismo día, ya fue marcado arriba
                            // Si es anterior, marcarlo ahora
                            if (egresoPPAnterior) {
                                egresosPPProcesadosRetroactivamente.add(egresoPP.minutaOrigen);
                            }
                        } else {
                            // No se encontró egreso PP ni anterior ni pendiente del mismo día
                            errores.push({
                                movimiento: mov,
                                mensaje: `No se encontró un egreso PP previo con MINUTA_ORIGEN ${mov.minutaOrigen} para aplicar el ingreso PP.`
                            });
                            break;
                        }
                    }
                    
                    // Verificar que la distribución existe y tiene elementos
                    if (!distribucion || distribucion.length === 0) {
                        errores.push({
                            movimiento: mov,
                            mensaje: `No se encontró distribución para el ingreso PP con MINUTA_ORIGEN ${mov.minutaOrigen}`
                        });
                        break; // Detener procesamiento al primer error
                    }
                    
                    // Verificar que la cantidad total coincida
                    const cantidadTotalDistribucion = distribucion.reduce((sum, d) => sum + d.cantidad, 0);
                    if (Math.abs(cantidadTotalDistribucion - mov.cantidad) > 0.01) {
                        errores.push({
                            movimiento: mov,
                            mensaje: `La cantidad del ingreso PP (${mov.cantidad}) no coincide con la cantidad del egreso PP (${cantidadTotalDistribucion}) para MINUTA_ORIGEN ${mov.minutaOrigen}`
                        });
                        break; // Detener procesamiento al primer error
                    }
                    
                    // Aplicar el ingreso en las mismas partidas y cantidades que el egreso
                    let cantidadTotalAplicada = 0;
                    const saldoAntes = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    
                    for (const dist of distribucion) {
                        const partida = partidas.find(p => p.id === dist.partidaId);
                        
                        if (!partida) {
                            errores.push({
                                movimiento: mov,
                                mensaje: `No se encontró la partida ${dist.partidaId} para aplicar el ingreso PP`
                            });
                            break; // Detener procesamiento al primer error
                        }
                        
                        // IMPORTANTE: Aplicar el ingreso PP incluso si la partida tiene saldo 0
                        // porque los egresos PP no cierran partidas
                        const saldoAntesPartida = partida.saldo;
                        partida.saldo += dist.cantidad;
                        cantidadTotalAplicada += dist.cantidad;
                        partida.imputaciones.push({
                            tipoMin: mov.tipoMin,
                            tipoMov: mov.tipoMov,
                            minutaOrigen: mov.minutaOrigen,
                            fecha: mov.fecha,
                            fechaStr: mov.fechaStr,
                            cantidad: dist.cantidad,
                            cantidadOriginal: mov.cantidad,
                            saldoDespues: partida.saldo
                        });
                        
                        // Log detallado si el saldo no cambió como se esperaba
                        if (saldoAntesPartida === 0 && dist.cantidad > 0 && partida.saldo === dist.cantidad) {
                            // Esto es normal: partida tenía saldo 0 y ahora tiene el ingreso
                        }
                    }
                    
                    // Log de ingreso PP aplicado
                    const saldoDespuesIngresoPP = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    
                    // Verificar si el saldo cambió correctamente
                    const diferenciaEsperada = cantidadTotalAplicada;
                    const diferenciaReal = saldoDespuesIngresoPP - saldoAntes;
                    
                    // Calcular saldo total incluyendo partidas con saldo <= 0 para diagnóstico
                    const saldoTotalIncluyendoNegativos = partidas
                        .filter(p => p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    
                    // Detalle de las partidas afectadas
                    const partidasAfectadas = distribucion.map(dist => {
                        const partida = partidas.find(p => p.id === dist.partidaId);
                        if (partida) {
                            const saldoAntesPartida = partida.saldo - dist.cantidad;
                            return {
                                id: partida.id,
                                saldoAntes: saldoAntesPartida,
                                cantidadAplicada: dist.cantidad,
                                saldoDespues: partida.saldo,
                                apareceEnSaldoTotal: partida.saldo > 0,
                                tipoMin: partida.tipoMin
                            };
                        }
                        return null;
                    }).filter(p => p !== null);
                    
                    // Verificar si alguna partida no aparece en el saldo total
                    const partidasNoAparecen = partidasAfectadas.filter(p => !p.apareceEnSaldoTotal);
                    
                    // SIEMPRE mostrar el detalle si hay diferencia o si alguna partida no aparece en el saldo total
                    if (Math.abs(diferenciaEsperada - diferenciaReal) > 0.01 || partidasNoAparecen.length > 0) {
                        console.log(`[INGRESO PP] ⚠️ ${mov.minutaOrigen} | Aplicado: ${cantidadTotalAplicada.toLocaleString('es-AR')} | Saldo antes: ${saldoAntes.toLocaleString('es-AR')} | Saldo después: ${saldoDespuesIngresoPP.toLocaleString('es-AR')} | Diferencia esperada: ${diferenciaEsperada.toLocaleString('es-AR')} | Diferencia real: ${diferenciaReal.toLocaleString('es-AR')} | Saldo total (incl. negativos): ${saldoTotalIncluyendoNegativos.toLocaleString('es-AR')} | Distribución: ${distribucion.length} partidas`);
                        partidasAfectadas.forEach(p => {
                            console.log(`[INGRESO PP] ⚠️   Partida ${p.id} (${p.tipoMin}): Saldo antes: ${p.saldoAntes.toLocaleString('es-AR')} | Aplicado: ${p.cantidadAplicada.toLocaleString('es-AR')} | Saldo después: ${p.saldoDespues.toLocaleString('es-AR')} | ${p.apareceEnSaldoTotal ? '✅' : '❌ NO aparece en saldo total'}`);
                        });
                    } else {
                        console.log(`[INGRESO PP] ${mov.minutaOrigen} | Aplicado: ${cantidadTotalAplicada.toLocaleString('es-AR')} | Saldo después: ${saldoDespuesIngresoPP.toLocaleString('es-AR')}`);
                    }
                    
                    // NO eliminar la distribución si el egreso PP correspondiente aún no se ha procesado
                    // La distribución se eliminará cuando el egreso PP se procese en su posición normal
                    // Solo eliminar si el egreso PP ya fue procesado retroactivamente (ya está marcado)
                    if (!egresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
                        // El egreso PP aún no se ha procesado, mantener la distribución para cuando se procese
                        // No eliminar la distribución aquí
                    } else {
                        // El egreso PP ya fue procesado retroactivamente, es seguro eliminar la distribución
                        delete distribucionesPP[mov.minutaOrigen];
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
                    // PP como EGRESO: aplicar FIFO a partidas existentes y guardar la distribución
                    // IMPORTANTE: Los egresos PP NO cierran partidas, así que incluimos partidas cerradas si tienen saldo
                    
                    // Si este egreso PP ya fue procesado retroactivamente desde un ingreso PP, saltarlo
                    if (egresosPPProcesadosRetroactivamente.has(mov.minutaOrigen)) {
                        // El egreso PP ya fue procesado, verificar que la distribución existe
                        // Si no existe, puede que se haya eliminado prematuramente, intentar recrearla desde las imputaciones
                        let distribucionExistente = distribucionesPP[mov.minutaOrigen];
                        
                        if (!distribucionExistente || distribucionExistente.length === 0) {
                            // Intentar recrear la distribución desde las imputaciones del egreso PP
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
                                break;
                            }
                        }
                        
                        // Log indicando que se salta porque ya fue procesado retroactivamente
                        const saldoActual = partidas
                            .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                            .reduce((sum, p) => sum + p.saldo, 0);
                        console.log(`[EGRESO PP] ${mov.minutaOrigen} | Ya procesado retroactivamente, saltando | Saldo: ${saldoActual.toLocaleString('es-AR')}`);
                        // Continuar sin procesar el egreso PP de nuevo
                        continue;
                    }
                    
                    const partidasDisponibles = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA') // Excluir PA, pero incluir cerradas si tienen saldo
                        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

                    // Calcular saldo total disponible
                    const saldoTotalDisponible = partidasDisponibles.reduce((sum, p) => sum + p.saldo, 0);
                    
                    // Log solo si hay error (se mostrará más abajo)

                    const distribucion = [];
                    
                    for (const partida of partidasDisponibles) {
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
                        
                        // IMPORTANTE: Los egresos PP NO cierran partidas, aunque el saldo llegue a 0
                        // No marcamos la partida como cerrada aquí
                        
                        // Guardar la distribución para el ingreso PP correspondiente
                        distribucion.push({
                            partidaId: partida.id,
                            cantidad: cantidadAplicar
                        });
                    }

                    if (cantidadRestante > 0) {
                        // Si no hay suficiente saldo, buscar ingresos "I" del mismo día que aún no se han procesado
                        
                        // Bandera para indicar si se procesó exitosamente el par completo (egreso PP + ingreso PP)
                        let parCompletoProcesado = false;
                        
                        // Buscar ingresos del mismo día que vienen después del movimiento actual
                        const ingresosDelDiaPendientes = movimientos.filter(m => {
                            const mismaFecha = m.fecha && mov.fecha &&
                                m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                m.fecha.getMonth() === mov.fecha.getMonth() &&
                                m.fecha.getDate() === mov.fecha.getDate();
                            return mismaFecha && 
                                   m.tipoMov === 'I' &&
                                   m !== mov &&
                                   movimientos.indexOf(m) > i; // Solo los que vienen después en el orden
                        });
                        
                        // También verificar si hay partidas creadas por ingresos anteriores del mismo día que aún tienen saldo
                        // Esto es importante porque un ingreso puede haber sido procesado antes pero su partida aún tiene saldo disponible
                        const partidasDelDiaConSaldo = partidas.filter(p => {
                            if (p.saldo <= 0 || p.tipoMin === 'PA') return false;
                            if (!p.fecha || !mov.fecha) return false;
                            return p.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                   p.fecha.getMonth() === mov.fecha.getMonth() &&
                                   p.fecha.getDate() === mov.fecha.getDate();
                        });
                        
                        const saldoDisponiblePartidasDelDia = partidasDelDiaConSaldo.reduce((sum, p) => sum + p.saldo, 0);
                        
                        // Ordenar por índice para procesarlos en orden
                        ingresosDelDiaPendientes.sort((a, b) => movimientos.indexOf(a) - movimientos.indexOf(b));
                        
                        if (ingresosDelDiaPendientes.length > 0) {
                            
                            // Separar ingresos I en dos grupos:
                            // 1. Ingresos que crean partidas directamente (TRFU, C, ING, PA)
                            // 2. Ingresos PP que necesitan un egreso PP previo
                            const ingresosQueCreanPartidas = ingresosDelDiaPendientes.filter(ing => ['TRFU', 'C', 'ING', 'PA'].includes(ing.tipoMin));
                            const ingresosPP = ingresosDelDiaPendientes.filter(ing => ing.tipoMin === 'PP');
                            
                            // Primero procesar ingresos que crean partidas directamente
                            for (const ingreso of ingresosQueCreanPartidas) {
                                if (cantidadRestante <= 0) break;
                                
                                // Verificar si ya existe una partida para este ingreso (puede haber sido procesado antes)
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
                                        cerrada: false, // Las partidas se crean abiertas
                                        imputaciones: []
                                    };
                                    partidas.push(partida);
                                }
                            }
                            
                            // Luego procesar ingresos PP: buscar sus egresos PP correspondientes del mismo día
                            for (const ingresoPP of ingresosPP) {
                                if (cantidadRestante <= 0) break;
                                
                                // PRIMERO: Verificar si el egreso PP correspondiente es el movimiento actual
                                const esElMovimientoActual = mov.tipoMin === 'PP' &&
                                                             mov.tipoMov === 'E' &&
                                                             mov.minutaOrigen === ingresoPP.minutaOrigen &&
                                                             mov.fecha.getFullYear() === ingresoPP.fecha.getFullYear() &&
                                                             mov.fecha.getMonth() === ingresoPP.fecha.getMonth() &&
                                                             mov.fecha.getDate() === ingresoPP.fecha.getDate();
                                
                                // Buscar egreso PP E del mismo MINUTA_ORIGEN en el mismo día
                                const egresoPPDelDia = esElMovimientoActual ? mov : movimientos.find(m => {
                                    const mismaFecha = m.fecha && ingresoPP.fecha &&
                                        m.fecha.getFullYear() === ingresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === ingresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === ingresoPP.fecha.getDate();
                                    return mismaFecha &&
                                           m.tipoMin === 'PP' &&
                                           m.tipoMov === 'E' &&
                                           m.minutaOrigen === ingresoPP.minutaOrigen &&
                                           m !== mov; // No incluir el movimiento actual (ya se verificó arriba)
                                });
                                
                                if (egresoPPDelDia) {
                                    if (esElMovimientoActual) {
                                        // CASO ESPECIAL: El ingreso PP corresponde al egreso PP actual
                                        // Revertir la aplicación parcial del egreso PP y procesar el par completo E/I
                                        // PASO 1: Revertir la aplicación parcial del egreso PP (restaurar saldo de partidas)
                                        for (const dist of distribucion) {
                                            const partida = partidas.find(p => p.id === dist.partidaId);
                                            if (partida) {
                                                partida.saldo += dist.cantidad; // Restaurar saldo
                                                // Remover todas las imputaciones del egreso PP parcial de esta partida
                                                partida.imputaciones = partida.imputaciones.filter(imp => 
                                                    !(imp.minutaOrigen === mov.minutaOrigen && imp.cantidad < 0 && Math.abs(imp.cantidad) === dist.cantidad)
                                                );
                                            }
                                        }
                                        
                                        // PASO 2: Procesar el egreso PP completo (aplicar a todas las partidas disponibles)
                                        let cantidadRestanteEgresoCompleto = mov.cantidad;
                                        const distribucionCompleta = [];
                                        const partidasDisponiblesParaEgresoCompleto = partidas
                                            .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                            .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                        
                                        for (const partida of partidasDisponiblesParaEgresoCompleto) {
                                            if (cantidadRestanteEgresoCompleto <= 0) break;
                                            
                                            const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgresoCompleto);
                                            partida.saldo -= cantidadAplicar;
                                            cantidadRestanteEgresoCompleto -= cantidadAplicar;
                                            
                                            distribucionCompleta.push({
                                                partidaId: partida.id,
                                                cantidad: cantidadAplicar
                                            });
                                        }
                                        
                                        // PASO 3: Si el egreso PP completo se pudo aplicar, aplicar el ingreso PP en las mismas partidas
                                        if (cantidadRestanteEgresoCompleto === 0) {
                                            // Guardar distribución completa
                                            distribucionesPP[ingresoPP.minutaOrigen] = distribucionCompleta;
                                            
                                            // Marcar el ingreso PP como procesado retroactivamente para evitar procesarlo dos veces
                                            ingresosPPProcesadosRetroactivamente.add(ingresoPP.minutaOrigen);
                                            
                                            // Aplicar el ingreso PP en las mismas partidas
                                            for (const dist of distribucionCompleta) {
                                                const partida = partidas.find(p => p.id === dist.partidaId);
                                                if (partida) {
                                                    partida.saldo += dist.cantidad;
                                                    partida.imputaciones.push({
                                                        tipoMin: mov.tipoMin,
                                                        tipoMov: mov.tipoMov,
                                                        minutaOrigen: mov.minutaOrigen,
                                                        fecha: mov.fecha,
                                                        fechaStr: mov.fechaStr,
                                                        cantidad: -dist.cantidad,
                                                        cantidadOriginal: mov.cantidad,
                                                        saldoDespues: partida.saldo
                                                    });
                                                    partida.imputaciones.push({
                                                        tipoMin: ingresoPP.tipoMin,
                                                        tipoMov: ingresoPP.tipoMov,
                                                        minutaOrigen: ingresoPP.minutaOrigen,
                                                        fecha: ingresoPP.fecha,
                                                        fechaStr: ingresoPP.fechaStr,
                                                        cantidad: dist.cantidad,
                                                        cantidadOriginal: ingresoPP.cantidad,
                                                        saldoDespues: partida.saldo
                                                    });
                                                }
                                            }
                                            
                                            // Actualizar la distribución y cantidad restante
                                            distribucion.length = 0;
                                            distribucion.push(...distribucionCompleta);
                                            cantidadRestante = 0; // El par completo se procesó, no hay faltante
                                            parCompletoProcesado = true; // Marcar que se procesó exitosamente
                                            
                                        } else {
                                            // Restaurar la distribución parcial original
                                            for (const dist of distribucion) {
                                                const partida = partidas.find(p => p.id === dist.partidaId);
                                                if (partida) {
                                                    partida.saldo -= dist.cantidad; // Revertir la reversión
                                                }
                                            }
                                        }
                                    } else {
                                        // CASO NORMAL: El ingreso PP corresponde a otro egreso PP del mismo día
                                        
                                        // Procesar el egreso PP primero
                                        let cantidadRestanteEgreso = egresoPPDelDia.cantidad;
                                        // Para egresos PP dentro del procesamiento de ingresos pendientes, NO excluir partidas cerradas
                                        // porque los PP pueden usar partidas cerradas si tienen saldo
                                        const partidasDisponiblesParaEgreso = partidas
                                            .filter(p => p.saldo > 0 && p.tipoMin !== 'PA') // Incluir cerradas si tienen saldo
                                            .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                        
                                        const distribucionPP = [];
                                        
                                        for (const partida of partidasDisponiblesParaEgreso) {
                                            if (cantidadRestanteEgreso <= 0) break;
                                            
                                            const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgreso);
                                            partida.saldo -= cantidadAplicar;
                                            cantidadRestanteEgreso -= cantidadAplicar;
                                            
                                            partida.imputaciones.push({
                                                tipoMin: egresoPPDelDia.tipoMin,
                                                tipoMov: egresoPPDelDia.tipoMov,
                                                minutaOrigen: egresoPPDelDia.minutaOrigen,
                                                fecha: egresoPPDelDia.fecha,
                                                fechaStr: egresoPPDelDia.fechaStr,
                                                cantidad: -cantidadAplicar,
                                                cantidadOriginal: egresoPPDelDia.cantidad,
                                                saldoDespues: partida.saldo
                                            });
                                            
                                            // IMPORTANTE: Los egresos PP NO cierran partidas, aunque el saldo llegue a 0
                                            // No marcamos la partida como cerrada aquí
                                            
                                            distribucionPP.push({
                                                partidaId: partida.id,
                                                cantidad: cantidadAplicar
                                            });
                                        }
                                        
                                        if (cantidadRestanteEgreso === 0) {
                                            // Guardar distribución y aplicar el ingreso PP
                                            distribucionesPP[ingresoPP.minutaOrigen] = distribucionPP;
                                            
                                            // Marcar el ingreso PP como procesado retroactivamente para evitar procesarlo dos veces
                                            ingresosPPProcesadosRetroactivamente.add(ingresoPP.minutaOrigen);
                                            
                                            // Aplicar el ingreso PP en las mismas partidas
                                            for (const dist of distribucionPP) {
                                                const partida = partidas.find(p => p.id === dist.partidaId);
                                                if (partida) {
                                                    partida.saldo += dist.cantidad;
                                                    partida.imputaciones.push({
                                                        tipoMin: ingresoPP.tipoMin,
                                                        tipoMov: ingresoPP.tipoMov,
                                                        minutaOrigen: ingresoPP.minutaOrigen,
                                                        fecha: ingresoPP.fecha,
                                                        fechaStr: ingresoPP.fechaStr,
                                                        cantidad: dist.cantidad,
                                                        cantidadOriginal: ingresoPP.cantidad,
                                                        saldoDespues: partida.saldo
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Recalcular partidas disponibles después de procesar los ingresos
                            const partidasDisponiblesActualizadas = partidas
                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                            
                            const saldoTotalActualizado = partidasDisponiblesActualizadas.reduce((sum, p) => sum + p.saldo, 0);
                            
                            // Reintentar aplicar el egreso PP con las nuevas partidas (solo si no se procesó el par completo)
                            if (!parCompletoProcesado) {
                                for (const partida of partidasDisponiblesActualizadas) {
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
                                    
                                    distribucion.push({
                                        partidaId: partida.id,
                                        cantidad: cantidadAplicar
                                    });
                                }
                            }
                        } else if (saldoDisponiblePartidasDelDia > 0) {
                            // Si no hay ingresos pendientes pero hay partidas del mismo día con saldo disponible,
                            // usar esas partidas directamente
                            
                            // Ordenar partidas del mismo día por fecha (FIFO)
                            partidasDelDiaConSaldo.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                            
                            // Aplicar el egreso PP a las partidas del mismo día
                            for (const partida of partidasDelDiaConSaldo) {
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
                                
                                distribucion.push({
                                    partidaId: partida.id,
                                    cantidad: cantidadAplicar
                                });
                            }
                        }
                        
                        // Verificar si hay un ingreso PP pendiente del mismo día que corresponde al egreso PP actual
                        // Si existe, no generar error porque se procesará cuando se encuentre el ingreso PP
                        const ingresoPPCorrespondientePendiente = movimientos
                            .slice(i + 1) // Movimientos después del actual
                            .find(m => {
                                const mismaFecha = m.fecha && mov.fecha &&
                                    m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                    m.fecha.getMonth() === mov.fecha.getMonth() &&
                                    m.fecha.getDate() === mov.fecha.getDate();
                                return mismaFecha &&
                                       m.tipoMin === 'PP' &&
                                       m.tipoMov === 'I' &&
                                       m.minutaOrigen === mov.minutaOrigen;
                            });
                        
                        // Solo generar error si todavía hay faltante Y no se procesó exitosamente el par completo
                        // Y no hay un ingreso PP pendiente que corresponda al egreso PP actual
                        if (cantidadRestante > 0 && !parCompletoProcesado && !ingresoPPCorrespondientePendiente) {
                            const cantidadAplicada = mov.cantidad - cantidadRestante;
                            const saldoFinal = partidas
                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                .reduce((sum, p) => sum + p.saldo, 0);
                            
                            // Calcular saldo disponible al inicio del día (suma de saldos de partidas creadas antes del día actual)
                            const saldoInicioDia = partidas
                                .filter(p => {
                                    if (p.tipoMin === 'PA') return false;
                                    // Solo partidas creadas antes del día actual
                                    if (!p.fecha || !mov.fecha) return false;
                                    return p.fecha.getTime() < new Date(mov.fecha.getFullYear(), mov.fecha.getMonth(), mov.fecha.getDate()).getTime();
                                })
                                .reduce((sum, p) => {
                                    // Calcular saldo original de la partida (antes de cualquier imputación del día)
                                    const imputacionesDelDia = p.imputaciones.filter(imp => {
                                        if (!imp.fecha || !mov.fecha) return false;
                                        return imp.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                               imp.fecha.getMonth() === mov.fecha.getMonth() &&
                                               imp.fecha.getDate() === mov.fecha.getDate();
                                    });
                                    const saldoOriginal = p.saldo + imputacionesDelDia.reduce((s, imp) => s - imp.cantidad, 0);
                                    return sum + saldoOriginal;
                                }, 0);
                            
                            // Calcular ingresos aplicados del día (que crean partidas nuevas)
                            const ingresosAplicadosDia = movimientos
                                .slice(0, i + 1)
                                .filter(m => {
                                    const mismaFecha = m.fecha && mov.fecha &&
                                        m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                        m.fecha.getMonth() === mov.fecha.getMonth() &&
                                        m.fecha.getDate() === mov.fecha.getDate();
                                    return mismaFecha && m.tipoMov === 'I' && ['TRFU', 'C', 'ING', 'PA'].includes(m.tipoMin);
                                })
                                .reduce((sum, m) => sum + m.cantidad, 0);
                            
                            // Calcular egresos aplicados del día (que consumen saldo de partidas)
                            const egresosAplicadosDia = movimientos
                                .slice(0, i + 1)
                                .filter(m => {
                                    const mismaFecha = m.fecha && mov.fecha &&
                                        m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                        m.fecha.getMonth() === mov.fecha.getMonth() &&
                                        m.fecha.getDate() === mov.fecha.getDate();
                                    return mismaFecha && m.tipoMov === 'E' && m.tipoMin !== 'PA';
                                })
                                .reduce((sum, m) => sum + m.cantidad, 0);
                            
                            // Obtener detalle de partidas disponibles actuales
                            const partidasDisponiblesActuales = partidas
                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                            
                            // Construir detalle de partidas
                            const detallePartidas = partidasDisponiblesActuales.length > 0
                                ? partidasDisponiblesActuales
                                    .map(p => `Partida ${p.id} (${p.tipoMin}, ${p.fechaStr}): ${formatearNumero(p.saldo)}`)
                                    .join(' | ')
                                : 'No hay partidas disponibles con saldo';
                            
                            // Buscar ingresos pendientes del mismo día que aún no se han procesado
                            const ingresosPendientesDia = movimientos
                                .slice(i + 1) // Movimientos después del actual
                                .filter(m => {
                                    const mismaFecha = m.fecha && mov.fecha &&
                                        m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                        m.fecha.getMonth() === mov.fecha.getMonth() &&
                                        m.fecha.getDate() === mov.fecha.getDate();
                                    return mismaFecha && m.tipoMov === 'I';
                                });
                            
                            // Construir información de ingresos pendientes
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
                            
                            // Construir mensaje de error mejorado
                            const mensajeError = [
                                `No hay suficiente saldo en las partidas para cubrir el egreso PP.`,
                                `Fecha: ${mov.fechaStr}`,
                                `Requerido: ${formatearNumero(mov.cantidad)}`,
                                `Saldo disponible al inicio del día: ${formatearNumero(Math.max(0, saldoInicioDia))}`,
                                `Ingresos aplicados del día: ${formatearNumero(ingresosAplicadosDia)}`,
                                `Egresos aplicados del día: ${formatearNumero(egresosAplicadosDia)}`,
                                `Disponible inicial (antes de procesar ingresos del día): ${formatearNumero(saldoTotalDisponible)}`,
                                `Disponible después de procesar ingresos I: ${formatearNumero(saldoFinal)}`,
                                `Aplicado: ${formatearNumero(cantidadAplicada)}`,
                                `Faltante: ${formatearNumero(cantidadRestante)}`,
                                `Cantidad de partidas disponibles: ${partidasDisponiblesActuales.length}`,
                                `Detalle partidas: ${detallePartidas}`,
                                ``,
                                infoIngresosPendientes
                            ].join('\n');
                            
                            errores.push({
                                movimiento: mov,
                                mensaje: mensajeError
                            });
                            break; // Detener procesamiento al primer error
                        }
                    }
                    
                    // Guardar la distribución para que el ingreso PP correspondiente la use
                    distribucionesPP[mov.minutaOrigen] = distribucion;
                    
                    // Log de saldo después del egreso PP
                    const saldoDespuesEgresoPP = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    console.log(`[EGRESO PP] ${mov.minutaOrigen} | Aplicado: ${(mov.cantidad - cantidadRestante).toLocaleString('es-AR')} | Saldo después: ${saldoDespuesEgresoPP.toLocaleString('es-AR')}`);
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
                        // Calcular saldo total disponible para el mensaje de error
                        const saldoTotalDisponible = partidas
                            .filter(p => p.tipoMin !== 'PA' && p.saldo > 0)
                            .reduce((sum, p) => sum + p.saldo, 0);
                        
                        errores.push({
                            movimiento: mov,
                            mensaje: `No hay suficiente saldo en las partidas para cubrir el egreso. Requerido: ${mov.cantidad}, Disponible: ${saldoTotalDisponible}, Faltante: ${cantidadRestante}`
                        });
                        break; // Detener procesamiento al primer error
                    }
                    
                    // Log de saldo después del egreso (no PP)
                    const saldoDespuesEgreso = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                        .reduce((sum, p) => sum + p.saldo, 0);
                    console.log(`[EGRESO] ${mov.tipoMin} | ${mov.minutaOrigen} | Aplicado: ${mov.cantidad.toLocaleString('es-AR')} | Saldo después: ${saldoDespuesEgreso.toLocaleString('es-AR')}`);
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
            
            console.log(`\n[FIN DÍA] ${ultimoMovimiento.fechaStr} - Saldo final disponible: ${saldoFinal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Ingresos: ${totalIngresosUltimoDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Egresos: ${totalEgresosUltimoDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
            console.log(`[FIN DÍA] ${ultimoMovimiento.fechaStr} - Saldo inicial del día: ${saldoInicialUltimoDia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Saldo esperado: ${saldoEsperado.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Diferencia: ${diferencia.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Saldo total (incl. negativos): ${saldoTotalIncluyendoNegativos.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
            console.log(`[FIN DÍA] ${ultimoMovimiento.fechaStr} - Resumen partidas: ${partidasPositivas.length} positivas (suma: ${sumaPartidasPositivas.toLocaleString('es-AR')}) | ${partidasCero.length} con saldo 0 | ${partidasNegativas.length} negativas (suma: ${sumaPartidasNegativas.toLocaleString('es-AR')})`);
            
            if (partidasNegativas.length > 0) {
                console.log(`[FIN DÍA] ${ultimoMovimiento.fechaStr} - Partidas con saldo negativo:`);
                partidasNegativas.forEach(p => {
                    console.log(`[FIN DÍA]   Partida ${p.id} (${p.tipoMin}, ${p.fecha}): ${p.saldo.toLocaleString('es-AR')}`);
                });
            }
        }
    }

    return { partidas, errores };
}

module.exports = inventarioController;

