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

            // Función para obtener la categoría y subcategoría de un movimiento
            const obtenerCategoria = (mov, todosMovimientos) => {
                const esIngreso = mov.tipoMov === 'I';
                const esEgreso = mov.tipoMov === 'E';
                const tienePataMismaFecha = tienePataPresenteMismaFecha(mov, todosMovimientos);
                const tienePataDistintaFecha = tienePataFuturaDistintaFecha(mov, todosMovimientos);
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

                // C - Transferencias de ingreso
                if (esIngreso && (tipoMin === 'TRFU' || tipoMin === 'TRANSFERENCIA')) {
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

                // G - Egresos Futuros (Patas futuro de movimientos que generan partida y patas contado con pata futura a distinta fecha que pata contado)
                // Solo egresos que NO tienen pata misma fecha (ya que esos van en D)
                if (esEgreso && !tienePataMismaFecha) {
                    // 1 - PF (Egreso/Pata futuro)
                    if (tipoMin === 'PF') {
                        return { categoria: 'G', subcategoria: 1, orden: 16 };
                    }
                    // 2 - PA (Egreso/Pata futuro)
                    if (tipoMin === 'PA') {
                        return { categoria: 'G', subcategoria: 2, orden: 17 };
                    }
                    // 3 - Préstamo (Egreso/Pata contado)
                    if (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST') {
                        return { categoria: 'G', subcategoria: 3, orden: 18 };
                    }
                    // 4 - PP (Egreso/Pata contado)
                    if (tipoMin === 'PP') {
                        return { categoria: 'G', subcategoria: 4, orden: 19 };
                    }
                    // 5 - OCT (Egreso/Pata contado)
                    if (tipoMin === 'OCT') {
                        return { categoria: 'G', subcategoria: 5, orden: 20 };
                    }
                }

                // H - Partidas manuales
                // Si hay un tipo específico para partidas manuales, se puede agregar aquí
                // Por ahora, si no hay un tipo específico, esta categoría queda vacía
                // Si se necesita agregar tipos específicos, se puede hacer aquí

                // I - Bloqueos/Garantías
                if (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR') {
                    // 1 - Ingreso garantías/bloqueos
                    if (esIngreso) {
                        return { categoria: 'I', subcategoria: 1, orden: 21 };
                    }
                    // 2 - Egreso garantías/bloqueos
                    if (esEgreso) {
                        return { categoria: 'I', subcategoria: 2, orden: 22 };
                    }
                }

                // J - Egresos (Contados) - solo los que no fueron clasificados en D, G o I
                if (esEgreso) {
                    // Verificar que no haya sido clasificado en D, G o I
                    const yaClasificadoEnDGI = 
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')) || // D
                        (!tienePataMismaFecha && (tipoMin === 'PF' || tipoMin === 'PA' || tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')) || // G
                        (tipoMin === 'BLOQUEO' || tipoMin === 'GARANTIA' || tipoMin === 'GARANTÍA' || tipoMin === 'BLOQ' || tipoMin === 'GAR'); // I
                    
                    if (!yaClasificadoEnDGI) {
                        // 1 - Venta
                        if (tipoMin === 'VENTA' || tipoMin === 'V') {
                            return { categoria: 'J', subcategoria: 1, orden: 23 };
                        }
                        // 2 - Transferencia
                        if (tipoMin === 'TRFU' || tipoMin === 'TRANSFERENCIA') {
                            return { categoria: 'J', subcategoria: 2, orden: 24 };
                        }
                        // 3 - Egreso
                        if (tipoMin === 'EGRESO' || tipoMin === 'EGR') {
                            return { categoria: 'J', subcategoria: 3, orden: 25 };
                        }
                        // 4 - Demás movimientos que sean egresos
                        return { categoria: 'J', subcategoria: 4, orden: 26 };
                    }
                }

                // F - Demás movimientos que sean ingresos (solo los que no fueron clasificados en A, B, C o E)
                // Esta categoría captura ingresos que no entraron en A, B, C o E
                if (esIngreso) {
                    // Verificar que no haya sido clasificado en A, B, C o E
                    const yaClasificado = 
                        (tipoMin === 'INGR' || tipoMin === 'ING' || tipoMin === 'C') || // A
                        (!tienePataMismaFecha && (tipoMin === 'OCT' || tipoMin === 'PP' || tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PA' || tipoMin === 'PF')) || // B
                        (tipoMin === 'TRFU' || tipoMin === 'TRANSFERENCIA') || // C
                        (tienePataMismaFecha && (tipoMin === 'PRESTAMO' || tipoMin === 'PRÉSTAMO' || tipoMin === 'PREST' || tipoMin === 'PP' || tipoMin === 'OCT')); // E
                    
                    if (!yaClasificado) {
                        return { categoria: 'F', subcategoria: 1, orden: 15 };
                    }
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

    for (let i = 0; i < movimientos.length; i++) {
        const mov = movimientos[i];
        try {
            // Si ya hay un error, detener el procesamiento
            if (errores.length > 0) {
                break;
            }
            
            indiceUltimoProcesado = i;

            // Log para debug del orden de procesamiento
            console.log(`[PROCESANDO] ${mov.tipoMin} | ${mov.tipoMov} | ${mov.minutaOrigen} | ${mov.cantidad} | ${mov.fechaStr}`);
            console.log(`[ESTADO] Partidas actuales: ${partidas.length}, Saldo total: ${partidas.reduce((sum, p) => sum + p.saldo, 0)}`);

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
                } else if (mov.tipoMin === 'PP') {
                    // PP como INGRESO: debe matchear con el egreso PP del mismo MINUTA_ORIGEN
                    console.log(`[PP INGRESO] Procesando ingreso PP ${mov.minutaOrigen}, cantidad: ${mov.cantidad}, fecha: ${mov.fechaStr}`);
                    console.log(`[PP INGRESO] Distribuciones disponibles:`, Object.keys(distribucionesPP));
                    let distribucion = distribucionesPP[mov.minutaOrigen];
                    
                    if (distribucion && distribucion.length > 0) {
                        console.log(`[PP INGRESO] ✅ Distribución encontrada para ${mov.minutaOrigen}: ${distribucion.length} partidas, cantidad total: ${distribucion.reduce((sum, d) => sum + d.cantidad, 0)}`);
                    } else {
                        console.log(`[PP INGRESO] ❌ No se encontró distribución guardada para ${mov.minutaOrigen}`);
                    }
                    
                    if (!distribucion || distribucion.length === 0) {
                        // Si no se encuentra la distribución guardada, buscar el egreso PP
                        console.log(`[PP INGRESO] No se encontró distribución guardada para ${mov.minutaOrigen}, buscando egreso PP`);
                        
                        const indiceActual = movimientos.indexOf(mov);
                        
                        // PRIMERO: Buscar el egreso PP con el mismo MINUTA_ORIGEN en el MISMO DÍA
                        console.log(`[PP INGRESO] Buscando egreso PP del mismo día para ${mov.minutaOrigen}, fecha: ${mov.fechaStr}`);
                        const egresoPPDelMismoDia = movimientos.find(m => {
                            const mismaFecha = m.fecha && mov.fecha &&
                                m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                m.fecha.getMonth() === mov.fecha.getMonth() &&
                                m.fecha.getDate() === mov.fecha.getDate();
                            const esPPEgreso = m.tipoMin === 'PP' && m.tipoMov === 'E';
                            const mismoMinutaOrigen = m.minutaOrigen === mov.minutaOrigen;
                            const noEsElMismo = m !== mov;
                            
                            return mismaFecha && esPPEgreso && mismoMinutaOrigen && noEsElMismo;
                        });
                        
                        if (egresoPPDelMismoDia) {
                            console.log(`[PP INGRESO] ✅ Encontrado egreso PP del mismo día: ${egresoPPDelMismoDia.fechaStr} | ${egresoPPDelMismoDia.minutaOrigen} | ${egresoPPDelMismoDia.cantidad}`);
                        } else {
                            // Log de todos los movimientos PP E del mismo día para debug
                            const movimientosPPEDelDia = movimientos.filter(m => {
                                const mismaFecha = m.fecha && mov.fecha &&
                                    m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                    m.fecha.getMonth() === mov.fecha.getMonth() &&
                                    m.fecha.getDate() === mov.fecha.getDate();
                                return mismaFecha && m.tipoMin === 'PP' && m.tipoMov === 'E';
                            });
                            console.log(`[PP INGRESO] Movimientos PP E del mismo día (${mov.fechaStr}):`, movimientosPPEDelDia.map(m => `${m.minutaOrigen} (${m.cantidad})`));
                        }
                        
                        // SEGUNDO: Si no se encuentra en el mismo día, buscar en TODOS los movimientos anteriores
                        const egresoPPAnterior = egresoPPDelMismoDia || movimientos.slice(0, indiceActual).find(m => {
                            return m.tipoMin === 'PP' && 
                                   m.tipoMov === 'E' && 
                                   m.minutaOrigen === mov.minutaOrigen;
                        });
                        
                        if (egresoPPDelMismoDia) {
                            console.log(`[PP INGRESO] ✅ Encontrado egreso PP del mismo día ${egresoPPDelMismoDia.fechaStr}, procesándolo primero como excepción`);
                        } else if (egresoPPAnterior) {
                            console.log(`[PP INGRESO] Encontrado egreso PP anterior del ${egresoPPAnterior.fechaStr}, procesándolo ahora`);
                        } else {
                            console.log(`[PP INGRESO] ⚠️ No se encontró egreso PP anterior ni del mismo día para ${mov.minutaOrigen}`);
                            console.log(`[PP INGRESO] Movimientos anteriores con tipo PP E:`, movimientos.slice(0, indiceActual).filter(m => m.tipoMin === 'PP' && m.tipoMov === 'E').map(m => `${m.minutaOrigen} (${m.fechaStr})`));
                        }
                        
                        if (egresoPPAnterior) {
                            if (egresoPPDelMismoDia) {
                                console.log(`[PP INGRESO] ⚠️ EXCEPCIÓN: Encontrado egreso PP del mismo día ${egresoPPAnterior.fechaStr}`);
                                console.log(`[PP INGRESO] IMPORTANTE: Antes de procesar el egreso PP del mismo día, procesar TODOS los ingresos PP pendientes del mismo día`);
                            } else {
                                console.log(`[PP INGRESO] Encontrado egreso PP anterior del ${egresoPPAnterior.fechaStr}, procesándolo ahora`);
                            }
                            
                            // Procesar el egreso PP encontrado ahora (simular su procesamiento)
                            const egresoPP = egresoPPAnterior;
                            let cantidadRestanteEgreso = egresoPP.cantidad;
                            
                            // Si es del mismo día, procesar PRIMERO todos los ingresos PP pendientes del mismo día
                            if (egresoPPDelMismoDia) {
                                const indiceMovimientoActual = movimientos.indexOf(mov);
                                
                                // Buscar TODOS los ingresos PP pendientes del mismo día (excepto el actual)
                                const ingresosPPPendientesMismoDia = movimientos.filter(m => {
                                    const mismaFecha = m.fecha && egresoPP.fecha &&
                                        m.fecha.getFullYear() === egresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === egresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === egresoPP.fecha.getDate();
                                    const indiceM = movimientos.indexOf(m);
                                    return mismaFecha && 
                                           m.tipoMov === 'I' &&
                                           m.tipoMin === 'PP' &&
                                           m !== mov && // Excluir el ingreso PP actual
                                           indiceM > indiceMovimientoActual; // Después del movimiento actual
                                });
                                
                                console.log(`[PP INGRESO] Ingresos PP pendientes del mismo día a procesar primero: ${ingresosPPPendientesMismoDia.length}`);
                                
                                // Procesar cada ingreso PP pendiente del mismo día
                                for (const ingresoPPPendiente of ingresosPPPendientesMismoDia) {
                                    // Buscar si tiene distribución guardada
                                    const distribucionExistente = distribucionesPP[ingresoPPPendiente.minutaOrigen];
                                    
                                    if (distribucionExistente && distribucionExistente.length > 0) {
                                        console.log(`[PP INGRESO] ✅ Procesando ingreso PP pendiente ${ingresoPPPendiente.minutaOrigen} con distribución existente`);
                                        
                                        // Aplicar el ingreso PP en las mismas partidas
                                        for (const dist of distribucionExistente) {
                                            const partida = partidas.find(p => p.id === dist.partidaId);
                                            if (partida) {
                                                partida.saldo += dist.cantidad;
                                                partida.imputaciones.push({
                                                    tipoMin: ingresoPPPendiente.tipoMin,
                                                    tipoMov: ingresoPPPendiente.tipoMov,
                                                    minutaOrigen: ingresoPPPendiente.minutaOrigen,
                                                    fecha: ingresoPPPendiente.fecha,
                                                    fechaStr: ingresoPPPendiente.fechaStr,
                                                    cantidad: dist.cantidad,
                                                    cantidadOriginal: ingresoPPPendiente.cantidad,
                                                    saldoDespues: partida.saldo
                                                });
                                            }
                                        }
                                        console.log(`[PP INGRESO] ✅ Procesado ingreso PP pendiente ${ingresoPPPendiente.minutaOrigen}`);
                                        
                                        // Limpiar la distribución después de usarla
                                        delete distribucionesPP[ingresoPPPendiente.minutaOrigen];
                                    } else {
                                        // Buscar egreso PP en movimientos anteriores
                                        const indiceIngresoPP = movimientos.indexOf(ingresoPPPendiente);
                                        const egresoPPParaIngreso = movimientos.slice(0, indiceIngresoPP).find(m => {
                                            return m.tipoMin === 'PP' && 
                                                   m.tipoMov === 'E' && 
                                                   m.minutaOrigen === ingresoPPPendiente.minutaOrigen;
                                        });
                                        
                                        if (egresoPPParaIngreso) {
                                            // Procesar el egreso PP retroactivamente
                                            let cantidadRestanteEgresoPendiente = egresoPPParaIngreso.cantidad;
                                            const partidasDisponiblesParaEgresoPendiente = partidas
                                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                            
                                            const distribucionPPPendiente = [];
                                            
                                            for (const partida of partidasDisponiblesParaEgresoPendiente) {
                                                if (cantidadRestanteEgresoPendiente <= 0) break;
                                                
                                                const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgresoPendiente);
                                                partida.saldo -= cantidadAplicar;
                                                cantidadRestanteEgresoPendiente -= cantidadAplicar;
                                                
                                                partida.imputaciones.push({
                                                    tipoMin: egresoPPParaIngreso.tipoMin,
                                                    tipoMov: egresoPPParaIngreso.tipoMov,
                                                    minutaOrigen: egresoPPParaIngreso.minutaOrigen,
                                                    fecha: egresoPPParaIngreso.fecha,
                                                    fechaStr: egresoPPParaIngreso.fechaStr,
                                                    cantidad: -cantidadAplicar,
                                                    cantidadOriginal: egresoPPParaIngreso.cantidad,
                                                    saldoDespues: partida.saldo
                                                });
                                                
                                                distribucionPPPendiente.push({
                                                    partidaId: partida.id,
                                                    cantidad: cantidadAplicar
                                                });
                                            }
                                            
                                            if (cantidadRestanteEgresoPendiente === 0) {
                                                // Guardar distribución y aplicar el ingreso PP
                                                distribucionesPP[ingresoPPPendiente.minutaOrigen] = distribucionPPPendiente;
                                                
                                                // Aplicar el ingreso PP en las mismas partidas
                                                for (const dist of distribucionPPPendiente) {
                                                    const partida = partidas.find(p => p.id === dist.partidaId);
                                                    if (partida) {
                                                        partida.saldo += dist.cantidad;
                                                        partida.imputaciones.push({
                                                            tipoMin: ingresoPPPendiente.tipoMin,
                                                            tipoMov: ingresoPPPendiente.tipoMov,
                                                            minutaOrigen: ingresoPPPendiente.minutaOrigen,
                                                            fecha: ingresoPPPendiente.fecha,
                                                            fechaStr: ingresoPPPendiente.fechaStr,
                                                            cantidad: dist.cantidad,
                                                            saldoDespues: partida.saldo
                                                        });
                                                    }
                                                }
                                                console.log(`[PP INGRESO] ✅ Procesado ingreso PP pendiente ${ingresoPPPendiente.minutaOrigen} (retroactivo)`);
                                            } else {
                                                console.log(`[PP INGRESO] ⚠️ No se pudo procesar completamente el ingreso PP pendiente ${ingresoPPPendiente.minutaOrigen}, faltante: ${cantidadRestanteEgresoPendiente}`);
                                            }
                                        }
                                    }
                                }
                                
                                console.log(`[PP INGRESO] Después de procesar ingresos PP pendientes, ahora procesando el egreso PP del mismo día`);
                            }
                            
                            // IMPORTANTE: Para egresos PP, NO excluir partidas cerradas si tienen saldo
                            // Las partidas cerradas por egresos NO-PP pueden recibir egresos PP
                            // Además, las partidas con saldo 0 por egresos PP anteriores también pueden recibir este egreso PP
                            const partidasDisponibles = partidas
                                .filter(p => {
                                    // Excluir PA
                                    if (p.tipoMin === 'PA') return false;
                                    // Incluir partidas con saldo > 0, incluso si están cerradas
                                    // porque los egresos PP pueden usar partidas cerradas
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
                                
                                // IMPORTANTE: Los egresos PP NO cierran partidas, aunque el saldo llegue a 0
                                
                                distribucionNueva.push({
                                    partidaId: partida.id,
                                    cantidad: cantidadAplicar
                                });
                            }
                            
                            if (cantidadRestanteEgreso > 0) {
                                // Si no hay suficiente saldo, buscar ingresos "I" pendientes del mismo día del egreso PP
                                console.log(`[PP INGRESO] No hay suficiente saldo para procesar el egreso PP (faltante: ${cantidadRestanteEgreso}), buscando ingresos I pendientes del día ${egresoPP.fechaStr}`);
                                
                                // Buscar TODOS los ingresos I del mismo día del egreso PP
                                // IMPORTANTE: Buscar TODOS los ingresos I del mismo día que vienen DESPUÉS del movimiento actual
                                // El movimiento actual puede estar antes o después del egreso PP en el orden
                                const indiceMovimientoActual = movimientos.indexOf(mov);
                                const indiceEgresoPP = movimientos.indexOf(egresoPP);
                                
                                // Buscar TODOS los ingresos I del mismo día que vienen DESPUÉS del movimiento actual
                                // Esto incluye todos los ingresos pendientes que aún no se han procesado
                                const ingresosDelDiaEgreso = movimientos.filter(m => {
                                    const mismaFecha = m.fecha && egresoPP.fecha &&
                                        m.fecha.getFullYear() === egresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === egresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === egresoPP.fecha.getDate();
                                    const indiceM = movimientos.indexOf(m);
                                    return mismaFecha && 
                                           m.tipoMov === 'I' &&
                                           m !== mov && // Excluir el ingreso PP actual que estamos procesando
                                           indiceM > indiceMovimientoActual; // Después del movimiento actual (para incluir todos los pendientes)
                                });
                                
                                console.log(`[PP INGRESO] Ingresos I pendientes del día ${egresoPP.fechaStr}: ${ingresosDelDiaEgreso.length} encontrados`);
                                console.log(`[PP INGRESO] Detalle ingresos pendientes:`, ingresosDelDiaEgreso.map(m => `${m.tipoMin} | ${m.minutaOrigen} | ${m.cantidad} | índice: ${movimientos.indexOf(m)}`));
                                console.log(`[PP INGRESO] Índice egreso PP: ${indiceEgresoPP}, Índice movimiento actual: ${indiceMovimientoActual}`);
                                
                                // Log adicional para debug: mostrar todos los ingresos I del mismo día
                                const todosIngresosDelDia = movimientos.filter(m => {
                                    const mismaFecha = m.fecha && egresoPP.fecha &&
                                        m.fecha.getFullYear() === egresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === egresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === egresoPP.fecha.getDate();
                                    return mismaFecha && m.tipoMov === 'I';
                                });
                                console.log(`[PP INGRESO] Todos los ingresos I del día ${egresoPP.fechaStr}:`, todosIngresosDelDia.map(m => `${m.tipoMin} | ${m.minutaOrigen} | ${m.cantidad} | índice: ${movimientos.indexOf(m)} | esMovActual: ${m === mov}`));
                                
                                // Ordenar por índice para procesarlos en orden
                                ingresosDelDiaEgreso.sort((a, b) => movimientos.indexOf(a) - movimientos.indexOf(b));
                                
                                // También buscar egresos PP pendientes del mismo día que tienen sus ingresos PP correspondientes
                                // IMPORTANTE: Buscar TODOS los egresos PP del mismo día que vienen DESPUÉS del movimiento actual
                                const egresosPPDelDiaEgreso = movimientos.filter(m => {
                                    const mismaFecha = m.fecha && egresoPP.fecha &&
                                        m.fecha.getFullYear() === egresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === egresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === egresoPP.fecha.getDate();
                                    const indiceM = movimientos.indexOf(m);
                                    return mismaFecha && 
                                           m.tipoMov === 'E' &&
                                           m.tipoMin === 'PP' &&
                                           m !== egresoPP && // Excluir el egreso PP que estamos procesando
                                           indiceM > indiceMovimientoActual; // Después del movimiento actual (para incluir todos los pendientes)
                                });
                                
                                console.log(`[PP INGRESO] Egresos PP pendientes del día ${egresoPP.fechaStr}: ${egresosPPDelDiaEgreso.length} encontrados`);
                                console.log(`[PP INGRESO] Detalle egresos pendientes:`, egresosPPDelDiaEgreso.map(m => `${m.tipoMin} | ${m.minutaOrigen} | ${m.cantidad} | índice: ${movimientos.indexOf(m)}`));
                                
                                console.log(`[PP INGRESO] Egresos PP pendientes del día ${egresoPP.fechaStr}: ${egresosPPDelDiaEgreso.length} encontrados`);
                                
                                if (ingresosDelDiaEgreso.length > 0 || egresosPPDelDiaEgreso.length > 0) {
                                    console.log(`[PP INGRESO] Encontrados ${ingresosDelDiaEgreso.length} ingreso(s) I y ${egresosPPDelDiaEgreso.length} egreso(s) PP pendientes del día del egreso PP, procesándolos primero`);
                                    
                                    // Separar ingresos I en dos grupos:
                                    // 1. Ingresos que crean partidas directamente (TRFU, C, ING, PA)
                                    // 2. Ingresos PP que necesitan un egreso PP previo
                                    const ingresosQueCreanPartidas = ingresosDelDiaEgreso.filter(ing => ['TRFU', 'C', 'ING', 'PA'].includes(ing.tipoMin));
                                    const ingresosPPDelDia = ingresosDelDiaEgreso.filter(ing => ing.tipoMin === 'PP');
                                    
                                    // Primero procesar ingresos que crean partidas directamente
                                    for (const ingreso of ingresosQueCreanPartidas) {
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
                                        console.log(`[PP INGRESO] Creada nueva partida ${partida.id} con saldo ${partida.saldo} desde ingreso pendiente`);
                                    }
                                    
                                    // Procesar pares PP E/I pendientes (tanto ingresos PP como egresos PP pendientes)
                                    // Crear un mapa de todos los pares PP del mismo día
                                    const paresPP = new Map();
                                    
                                    // Agregar ingresos PP pendientes
                                    for (const ingresoPPDelDia of ingresosPPDelDia) {
                                        if (!paresPP.has(ingresoPPDelDia.minutaOrigen)) {
                                            paresPP.set(ingresoPPDelDia.minutaOrigen, { ingreso: null, egreso: null });
                                        }
                                        paresPP.get(ingresoPPDelDia.minutaOrigen).ingreso = ingresoPPDelDia;
                                    }
                                    
                                    // Agregar egresos PP pendientes
                                    for (const egresoPPDelDia of egresosPPDelDiaEgreso) {
                                        if (!paresPP.has(egresoPPDelDia.minutaOrigen)) {
                                            paresPP.set(egresoPPDelDia.minutaOrigen, { ingreso: null, egreso: null });
                                        }
                                        paresPP.get(egresoPPDelDia.minutaOrigen).egreso = egresoPPDelDia;
                                    }
                                    
                                    // PRIMERO: Procesar TODOS los ingresos PP pendientes que pueden crear saldo
                                    // Esto incluye:
                                    // 1. Ingresos PP que tienen distribución guardada (ya procesados anteriormente)
                                    // 2. Ingresos PP que pueden encontrar su egreso PP en movimientos anteriores
                                    // IMPORTANTE: Procesar TODOS los ingresos PP pendientes antes de procesar cualquier egreso PP
                                    
                                    // Procesar ingresos PP pendientes que tienen distribución guardada (más rápido, no requieren procesar egreso PP)
                                    for (const ingresoPPDelDia of ingresosPPDelDia) {
                                        // Si ya tiene un par completo en el mismo día, saltarlo por ahora (se procesará después)
                                        if (paresPP.has(ingresoPPDelDia.minutaOrigen) && 
                                            paresPP.get(ingresoPPDelDia.minutaOrigen).ingreso && 
                                            paresPP.get(ingresoPPDelDia.minutaOrigen).egreso) {
                                            continue;
                                        }
                                        
                                        // Verificar si ya tiene distribución guardada
                                        const distribucionExistente = distribucionesPP[ingresoPPDelDia.minutaOrigen];
                                        
                                        if (distribucionExistente && distribucionExistente.length > 0) {
                                            console.log(`[PP INGRESO] ✅ Distribución ya existe para ${ingresoPPDelDia.minutaOrigen}, aplicando ingreso PP`);
                                            
                                            // Aplicar el ingreso PP en las mismas partidas
                                            for (const dist of distribucionExistente) {
                                                const partida = partidas.find(p => p.id === dist.partidaId);
                                                if (partida) {
                                                    partida.saldo += dist.cantidad;
                                                    partida.imputaciones.push({
                                                        tipoMin: ingresoPPDelDia.tipoMin,
                                                        tipoMov: ingresoPPDelDia.tipoMov,
                                                        minutaOrigen: ingresoPPDelDia.minutaOrigen,
                                                        fecha: ingresoPPDelDia.fecha,
                                                        fechaStr: ingresoPPDelDia.fechaStr,
                                                        cantidad: dist.cantidad,
                                                        cantidadOriginal: ingresoPPDelDia.cantidad,
                                                        saldoDespues: partida.saldo
                                                    });
                                                }
                                            }
                                            console.log(`[PP INGRESO] ✅ Procesado ingreso PP pendiente ${ingresoPPDelDia.minutaOrigen} usando distribución existente`);
                                            
                                            // Limpiar la distribución después de usarla
                                            delete distribucionesPP[ingresoPPDelDia.minutaOrigen];
                                        }
                                    }
                                    
                                    // Procesar ingresos PP pendientes que NO tienen distribución guardada pero pueden encontrar su egreso PP en movimientos anteriores
                                    for (const ingresoPPDelDia of ingresosPPDelDia) {
                                        // Si ya tiene un par completo en el mismo día, saltarlo por ahora
                                        if (paresPP.has(ingresoPPDelDia.minutaOrigen) && 
                                            paresPP.get(ingresoPPDelDia.minutaOrigen).ingreso && 
                                            paresPP.get(ingresoPPDelDia.minutaOrigen).egreso) {
                                            continue;
                                        }
                                        
                                        // Si ya fue procesado (tiene distribución), saltarlo
                                        if (distribucionesPP[ingresoPPDelDia.minutaOrigen]) {
                                            continue;
                                        }
                                        
                                        console.log(`[PP INGRESO] Procesando ingreso PP pendiente ${ingresoPPDelDia.minutaOrigen} (sin par completo en mismo día)`);
                                        
                                        // Buscar egreso PP en movimientos anteriores (ya procesados, pueden tener distribución guardada)
                                        const indiceIngresoPP = movimientos.indexOf(ingresoPPDelDia);
                                        const egresoPPDelDiaParaIngreso = movimientos.slice(0, indiceIngresoPP).find(m => {
                                            return m.tipoMin === 'PP' && 
                                                   m.tipoMov === 'E' && 
                                                   m.minutaOrigen === ingresoPPDelDia.minutaOrigen;
                                        });
                                        
                                        if (egresoPPDelDiaParaIngreso) {
                                            // No hay distribución guardada, procesar el egreso PP retroactivamente
                                            console.log(`[PP INGRESO] No se encontró distribución guardada para ${ingresoPPDelDia.minutaOrigen}, procesando egreso PP retroactivamente`);
                                            
                                            // Procesar el egreso PP primero
                                            let cantidadRestanteEgresoPendiente = egresoPPDelDiaParaIngreso.cantidad;
                                            const partidasDisponiblesParaEgresoPendiente = partidas
                                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                            
                                            const distribucionPPPendiente = [];
                                            
                                            for (const partida of partidasDisponiblesParaEgresoPendiente) {
                                                if (cantidadRestanteEgresoPendiente <= 0) break;
                                                
                                                const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgresoPendiente);
                                                partida.saldo -= cantidadAplicar;
                                                cantidadRestanteEgresoPendiente -= cantidadAplicar;
                                                
                                                partida.imputaciones.push({
                                                    tipoMin: egresoPPDelDiaParaIngreso.tipoMin,
                                                    tipoMov: egresoPPDelDiaParaIngreso.tipoMov,
                                                    minutaOrigen: egresoPPDelDiaParaIngreso.minutaOrigen,
                                                    fecha: egresoPPDelDiaParaIngreso.fecha,
                                                    fechaStr: egresoPPDelDiaParaIngreso.fechaStr,
                                                    cantidad: -cantidadAplicar,
                                                    saldoDespues: partida.saldo
                                                });
                                                
                                                distribucionPPPendiente.push({
                                                    partidaId: partida.id,
                                                    cantidad: cantidadAplicar
                                                });
                                            }
                                            
                                            if (cantidadRestanteEgresoPendiente === 0) {
                                                // Guardar distribución y aplicar el ingreso PP
                                                distribucionesPP[ingresoPPDelDia.minutaOrigen] = distribucionPPPendiente;
                                                
                                                // Aplicar el ingreso PP en las mismas partidas
                                                for (const dist of distribucionPPPendiente) {
                                                    const partida = partidas.find(p => p.id === dist.partidaId);
                                                    if (partida) {
                                                        partida.saldo += dist.cantidad;
                                                        partida.imputaciones.push({
                                                            tipoMin: ingresoPPDelDia.tipoMin,
                                                            tipoMov: ingresoPPDelDia.tipoMov,
                                                            minutaOrigen: ingresoPPDelDia.minutaOrigen,
                                                            fecha: ingresoPPDelDia.fecha,
                                                            fechaStr: ingresoPPDelDia.fechaStr,
                                                            cantidad: dist.cantidad,
                                                            saldoDespues: partida.saldo
                                                        });
                                                    }
                                                }
                                                console.log(`[PP INGRESO] ✅ Procesado par PP E/I pendiente para ${ingresoPPDelDia.minutaOrigen} (retroactivo)`);
                                            } else {
                                                console.log(`[PP INGRESO] ⚠️ No se pudo procesar completamente el egreso PP retroactivo para ${ingresoPPDelDia.minutaOrigen}, faltante: ${cantidadRestanteEgresoPendiente}`);
                                            }
                                        }
                                    }
                                    
                                    // SEGUNDO: Procesar todos los pares PP completos (que tienen tanto E como I en el mismo día)
                                    for (const [minutaOrigen, par] of paresPP.entries()) {
                                        if (par.ingreso && par.egreso) {
                                            console.log(`[PP INGRESO] Procesando par PP E/I completo pendiente para ${minutaOrigen}`);
                                            
                                            // Procesar el egreso PP primero
                                            let cantidadRestanteEgresoPendiente = par.egreso.cantidad;
                                            const partidasDisponiblesParaEgresoPendiente = partidas
                                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                            
                                            const distribucionPPPendiente = [];
                                            
                                            for (const partida of partidasDisponiblesParaEgresoPendiente) {
                                                if (cantidadRestanteEgresoPendiente <= 0) break;
                                                
                                                const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteEgresoPendiente);
                                                partida.saldo -= cantidadAplicar;
                                                cantidadRestanteEgresoPendiente -= cantidadAplicar;
                                                
                                                partida.imputaciones.push({
                                                    tipoMin: par.egreso.tipoMin,
                                                    tipoMov: par.egreso.tipoMov,
                                                    minutaOrigen: par.egreso.minutaOrigen,
                                                    fecha: par.egreso.fecha,
                                                    fechaStr: par.egreso.fechaStr,
                                                    cantidad: -cantidadAplicar,
                                                    cantidadOriginal: par.egreso.cantidad,
                                                    saldoDespues: partida.saldo
                                                });
                                                
                                                distribucionPPPendiente.push({
                                                    partidaId: partida.id,
                                                    cantidad: cantidadAplicar
                                                });
                                            }
                                            
                                            if (cantidadRestanteEgresoPendiente === 0) {
                                                // Guardar distribución y aplicar el ingreso PP
                                                distribucionesPP[par.ingreso.minutaOrigen] = distribucionPPPendiente;
                                                
                                                // Aplicar el ingreso PP en las mismas partidas
                                                for (const dist of distribucionPPPendiente) {
                                                    const partida = partidas.find(p => p.id === dist.partidaId);
                                                    if (partida) {
                                                        partida.saldo += dist.cantidad;
                                                        partida.imputaciones.push({
                                                            tipoMin: par.ingreso.tipoMin,
                                                            tipoMov: par.ingreso.tipoMov,
                                                            minutaOrigen: par.ingreso.minutaOrigen,
                                                            fecha: par.ingreso.fecha,
                                                            fechaStr: par.ingreso.fechaStr,
                                                            cantidad: dist.cantidad,
                                                            cantidadOriginal: par.ingreso.cantidad,
                                                            saldoDespues: partida.saldo
                                                        });
                                                    }
                                                }
                                                console.log(`[PP INGRESO] ✅ Procesado par PP E/I completo pendiente para ${minutaOrigen}`);
                                            } else {
                                                console.log(`[PP INGRESO] ⚠️ No se pudo procesar completamente el egreso PP para ${minutaOrigen}, faltante: ${cantidadRestanteEgresoPendiente}`);
                                            }
                                        }
                                    }
                                    
                                    
                                    // Recalcular partidas disponibles después de procesar los ingresos pendientes
                                    const nuevasPartidasDisponibles = partidas
                                        .filter(p => {
                                            if (p.tipoMin === 'PA') return false;
                                            return p.saldo > 0;
                                        })
                                        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                                    
                                    // Reintentar aplicar el egreso PP original con las nuevas partidas
                                    console.log(`[PP INGRESO] Reintentando egreso PP ${egresoPP.minutaOrigen} después de procesar ingresos pendientes`);
                                    distribucionNueva.length = 0; // Limpiar distribución anterior
                                    let cantidadRestanteReintento = egresoPP.cantidad;
                                    
                                    for (const partida of nuevasPartidasDisponibles) {
                                        if (cantidadRestanteReintento <= 0) break;
                                        
                                        const cantidadAplicar = Math.min(partida.saldo, cantidadRestanteReintento);
                                        partida.saldo -= cantidadAplicar;
                                        cantidadRestanteReintento -= cantidadAplicar;
                                        
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
                                    
                                    cantidadRestanteEgreso = cantidadRestanteReintento;
                                }
                                
                                if (cantidadRestanteEgreso > 0) {
                                    errores.push({
                                        movimiento: mov,
                                        mensaje: `No hay suficiente saldo para procesar el egreso PP anterior. Faltante: ${cantidadRestanteEgreso}. Se procesaron ingresos I pendientes del día pero aún falta saldo.`
                                    });
                                    break;
                                }
                            }
                            
                            // Guardar la distribución y usarla para el ingreso
                            distribucionesPP[mov.minutaOrigen] = distribucionNueva;
                            distribucion = distribucionNueva;
                            if (egresoPPDelMismoDia) {
                                console.log(`[PP INGRESO] ✅ Distribución creada desde egreso PP del mismo día (excepción): ${distribucionNueva.length} partidas`);
                            } else {
                                console.log(`[PP INGRESO] Distribución creada desde egreso PP anterior: ${distribucionNueva.length} partidas`);
                            }
                        } else {
                            // Solo generar error si NO se encontró ni en el mismo día ni en movimientos anteriores
                            errores.push({
                                movimiento: mov,
                                mensaje: `No se encontró un egreso PP previo con MINUTA_ORIGEN ${mov.minutaOrigen} para aplicar el ingreso PP. Se buscó en el mismo día y en todos los movimientos anteriores sin resultados.`
                            });
                            break; // Detener procesamiento al primer error
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
                    console.log(`[PP INGRESO] Aplicando ingreso PP ${mov.minutaOrigen} a ${distribucion.length} partidas`);
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
                        partida.saldo += dist.cantidad;
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
                        
                        console.log(`[PP INGRESO] Partida ${partida.id}: saldo aumentado en ${dist.cantidad}, nuevo saldo: ${partida.saldo}`);
                    }
                    
                    // Limpiar la distribución después de usarla (opcional, para evitar reutilización)
                    delete distribucionesPP[mov.minutaOrigen];
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
                    const partidasDisponibles = partidas
                        .filter(p => p.saldo > 0 && p.tipoMin !== 'PA') // Excluir PA, pero incluir cerradas si tienen saldo
                        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

                    // Calcular saldo total disponible
                    const saldoTotalDisponible = partidasDisponibles.reduce((sum, p) => sum + p.saldo, 0);
                    
                    // Log para debug
                    console.log(`[PP EGRESO] MINUTA_ORIGEN: ${mov.minutaOrigen}, Cantidad requerida: ${mov.cantidad}`);
                    console.log(`[PP EGRESO] Partidas disponibles: ${partidasDisponibles.length}, Saldo total: ${saldoTotalDisponible}`);
                    if (partidasDisponibles.length > 0) {
                        console.log(`[PP EGRESO] Detalle partidas:`, partidasDisponibles.map(p => ({
                            id: p.id,
                            tipoMin: p.tipoMin,
                            saldo: p.saldo,
                            fecha: p.fechaStr
                        })));
                    }

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
                        console.log(`[PP EGRESO] No hay suficiente saldo (faltante: ${cantidadRestante}), buscando ingresos I del mismo día ${mov.fechaStr}`);
                        
                        const ingresosDelDia = movimientos.filter(m => {
                            const mismaFecha = m.fecha && mov.fecha &&
                                m.fecha.getFullYear() === mov.fecha.getFullYear() &&
                                m.fecha.getMonth() === mov.fecha.getMonth() &&
                                m.fecha.getDate() === mov.fecha.getDate();
                            return mismaFecha && 
                                   m.tipoMov === 'I' &&
                                   m !== mov &&
                                   movimientos.indexOf(m) > i; // Solo los que vienen después en el orden
                        });
                        
                        // Ordenar por índice para procesarlos en orden
                        ingresosDelDia.sort((a, b) => movimientos.indexOf(a) - movimientos.indexOf(b));
                        
                        if (ingresosDelDia.length > 0) {
                            console.log(`[PP EGRESO] Encontrados ${ingresosDelDia.length} ingreso(s) I del mismo día, procesándolos primero`);
                            
                            // Separar ingresos I en dos grupos:
                            // 1. Ingresos que crean partidas directamente (TRFU, C, ING, PA)
                            // 2. Ingresos PP que necesitan un egreso PP previo
                            const ingresosQueCreanPartidas = ingresosDelDia.filter(ing => ['TRFU', 'C', 'ING', 'PA'].includes(ing.tipoMin));
                            const ingresosPP = ingresosDelDia.filter(ing => ing.tipoMin === 'PP');
                            
                            // Primero procesar ingresos que crean partidas directamente
                            for (const ingreso of ingresosQueCreanPartidas) {
                                if (cantidadRestante <= 0) break;
                                
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
                                console.log(`[PP EGRESO] Creada nueva partida ${partida.id} con saldo ${partida.saldo}`);
                            }
                            
                            // Luego procesar ingresos PP: buscar sus egresos PP correspondientes del mismo día
                            for (const ingresoPP of ingresosPP) {
                                if (cantidadRestante <= 0) break;
                                
                                // Buscar egreso PP E del mismo MINUTA_ORIGEN en el mismo día
                                const egresoPPDelDia = movimientos.find(m => {
                                    const mismaFecha = m.fecha && ingresoPP.fecha &&
                                        m.fecha.getFullYear() === ingresoPP.fecha.getFullYear() &&
                                        m.fecha.getMonth() === ingresoPP.fecha.getMonth() &&
                                        m.fecha.getDate() === ingresoPP.fecha.getDate();
                                    return mismaFecha &&
                                           m.tipoMin === 'PP' &&
                                           m.tipoMov === 'E' &&
                                           m.minutaOrigen === ingresoPP.minutaOrigen &&
                                           m !== mov; // No incluir el movimiento actual
                                });
                                
                                if (egresoPPDelDia) {
                                    console.log(`[PP EGRESO] Procesando par PP E/I para ${ingresoPP.minutaOrigen}`);
                                    
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
                                        console.log(`[PP EGRESO] Procesado par PP E/I para ${ingresoPP.minutaOrigen}, saldo neto: 0`);
                                    } else {
                                        console.log(`[PP EGRESO] No se pudo procesar completamente el egreso PP para ${ingresoPP.minutaOrigen}, faltante: ${cantidadRestanteEgreso}`);
                                    }
                                } else {
                                    console.log(`[PP EGRESO] No se encontró egreso PP E para el ingreso PP I ${ingresoPP.minutaOrigen}`);
                                }
                            }
                            
                            // Recalcular partidas disponibles después de procesar los ingresos
                            const partidasDisponiblesActualizadas = partidas
                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                            
                            const saldoTotalActualizado = partidasDisponiblesActualizadas.reduce((sum, p) => sum + p.saldo, 0);
                            console.log(`[PP EGRESO] Después de procesar ingresos I: Saldo total disponible: ${saldoTotalActualizado}, Faltante: ${cantidadRestante}`);
                            
                            // Reintentar aplicar el egreso PP con las nuevas partidas
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
                                    saldoDespues: partida.saldo
                                });
                                
                                distribucion.push({
                                    partidaId: partida.id,
                                    cantidad: cantidadAplicar
                                });
                            }
                        }
                        
                        if (cantidadRestante > 0) {
                            const cantidadAplicada = mov.cantidad - cantidadRestante;
                            const saldoFinal = partidas
                                .filter(p => p.saldo > 0 && p.tipoMin !== 'PA')
                                .reduce((sum, p) => sum + p.saldo, 0);
                            errores.push({
                                movimiento: mov,
                                mensaje: `No hay suficiente saldo en las partidas para cubrir el egreso PP. Requerido: ${mov.cantidad}, Disponible inicial: ${saldoTotalDisponible}, Disponible después de procesar ingresos I: ${saldoFinal}, Aplicado: ${cantidadAplicada}, Faltante: ${cantidadRestante}. Partidas disponibles: ${partidasDisponibles.length}`
                            });
                            break; // Detener procesamiento al primer error
                        }
                    }
                    
                    // Guardar la distribución para que el ingreso PP correspondiente la use
                    distribucionesPP[mov.minutaOrigen] = distribucion;
                    console.log(`[PP EGRESO] Distribución guardada para ${mov.minutaOrigen}: ${distribucion.length} partidas, cantidad total: ${distribucion.reduce((sum, d) => sum + d.cantidad, 0)}`);
                } else {
                    // Para otros tipos (TRFU, C, ING, etc.), aplicar FIFO (primero las partidas más antiguas)
                    // IMPORTANTE: Estos egresos SÍ cierran partidas cuando el saldo llega a 0
                    const partidasOrdenadas = partidas
                        .filter(p => {
                            // Excluir partidas PA (solo se impactan con egresos PA)
                            if (p.tipoMin === 'PA') return false;
                            // Excluir partidas cerradas (ya no pueden recibir imputaciones)
                            if (p.cerrada) return false;
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
                        if (partida.saldo === 0) {
                            partida.cerrada = true;
                            console.log(`[CIERRE PARTIDA] Partida ${partida.id} cerrada por egreso ${mov.tipoMin} | ${mov.tipoMov}`);
                        }
                    }

                    if (cantidadRestante > 0) {
                        errores.push({
                            movimiento: mov,
                            mensaje: `No hay suficiente saldo en las partidas para cubrir el egreso. Faltante: ${cantidadRestante}`
                        });
                        break; // Detener procesamiento al primer error
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

    return { partidas, errores };
}

module.exports = inventarioController;

