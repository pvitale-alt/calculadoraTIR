/**
 * Módulo para calcular días hábiles considerando feriados
 */

// Cache de feriados para evitar múltiples consultas
let feriadosCache = null;
let feriadosCacheFecha = null;

/**
 * Formatear fecha a formato YYYY-MM-DD (función local para asegurar disponibilidad)
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function formatearFechaInputLocal(fecha) {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
        return '';
    }
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Obtener feriados desde el cache (NO consulta BD automáticamente)
 * @param {string} fechaDesde - Fecha inicio en formato YYYY-MM-DD
 * @param {string} fechaHasta - Fecha fin en formato YYYY-MM-DD
 * @returns {Array} Array de fechas de feriados en formato YYYY-MM-DD (solo del cache)
 */
function obtenerFeriados(fechaDesde, fechaHasta) {
    // Solo usar cache, NO consultar BD automáticamente
    if (feriadosCache && feriadosCacheFecha) {
        const cacheDesde = crearFechaDesdeString(feriadosCacheFecha.desde);
        const cacheHasta = crearFechaDesdeString(feriadosCacheFecha.hasta);
        const desde = crearFechaDesdeString(fechaDesde);
        const hasta = crearFechaDesdeString(fechaHasta);
        
        // Si el cache cubre el rango solicitado, usar cache
        if (desde >= cacheDesde && hasta <= cacheHasta) {
            return feriadosCache;
        }
    }
    
    // Si no hay cache o no cubre el rango, retornar array vacío
    // El usuario debe cargar los datos manualmente primero
    return [];
}

/**
 * Cargar feriados desde BD manualmente (para poblar el cache)
 * @param {string} fechaDesde - Fecha inicio en formato YYYY-MM-DD
 * @param {string} fechaHasta - Fecha fin en formato YYYY-MM-DD
 * @returns {Promise<Array>} Array de fechas de feriados en formato YYYY-MM-DD
 */
async function cargarFeriadosDesdeBD(fechaDesde, fechaHasta) {
    try {
        // Asegurar que las fechas estén en formato YYYY-MM-DD (strings)
        const desdeFormateado = typeof fechaDesde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) 
            ? fechaDesde 
            : (fechaDesde instanceof Date ? formatearFechaInputLocal(fechaDesde) : String(fechaDesde));
        const hastaFormateado = typeof fechaHasta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaHasta) 
            ? fechaHasta 
            : (fechaHasta instanceof Date ? formatearFechaInputLocal(fechaHasta) : String(fechaHasta));
        
        const response = await fetch(`/api/feriados/bd?desde=${encodeURIComponent(desdeFormateado)}&hasta=${encodeURIComponent(hastaFormateado)}`);
        const result = await response.json();
        
        if (result.success && result.datos) {
            // Extraer solo las fechas en formato YYYY-MM-DD
            const fechasNuevas = result.datos.map(feriado => {
                let fecha = feriado.fecha;
                if (typeof fecha === 'string' && fecha.includes('T')) {
                    fecha = fecha.split('T')[0];
                }
                return fecha;
            });
            
            // Combinar con cache existente si hay
            if (feriadosCache && feriadosCache.length > 0) {
                // Combinar arrays y eliminar duplicados
                const todasLasFechas = [...new Set([...feriadosCache, ...fechasNuevas])].sort();
                
                // Determinar el rango combinado
                const cacheDesde = crearFechaDesdeString(feriadosCacheFecha.desde);
                const cacheHasta = crearFechaDesdeString(feriadosCacheFecha.hasta);
                const nuevoDesde = crearFechaDesdeString(fechaDesde);
                const nuevoHasta = crearFechaDesdeString(fechaHasta);
                
                const desdeCombinado = nuevoDesde < cacheDesde ? fechaDesde : feriadosCacheFecha.desde;
                const hastaCombinado = nuevoHasta > cacheHasta ? fechaHasta : feriadosCacheFecha.hasta;
                
                // Actualizar cache con datos combinados
                feriadosCache = todasLasFechas;
                feriadosCacheFecha = { desde: desdeCombinado, hasta: hastaCombinado };
                
                console.log('[cargarFeriadosDesdeBD] Cache expandido:', {
                    desde: desdeCombinado,
                    hasta: hastaCombinado,
                    totalFechas: todasLasFechas.length
                });
            } else {
                // Si no hay cache, crear uno nuevo
                feriadosCache = fechasNuevas;
                feriadosCacheFecha = { desde: fechaDesde, hasta: fechaHasta };
            }
            
            return feriadosCache;
        }
        
        return [];
    } catch (error) {
        console.error('Error al cargar feriados desde BD:', error);
        return [];
    }
}

/**
 * Verificar si una fecha es día hábil (no es sábado, domingo ni feriado)
 * @param {Date} fecha - Fecha a verificar
 * @param {Array<string>} feriados - Array de fechas de feriados en formato YYYY-MM-DD
 * @returns {boolean} true si es día hábil
 */
function esDiaHabil(fecha, feriados = []) {
    const diaSemana = fecha.getDay();
    
    // Sábado (6) o domingo (0) no son hábiles
    if (diaSemana === 0 || diaSemana === 6) {
        return false;
    }
    
    // Verificar si es feriado
    // Usar función local para asegurar formato correcto YYYY-MM-DD
    const fechaStr = formatearFechaInputLocal(fecha);
    const esFeriado = feriados.includes(fechaStr);
    
    return !esFeriado;
}

/**
 * Obtener el próximo día hábil a partir de una fecha
 * @param {Date} fecha - Fecha de inicio
 * @param {Array<string>} feriados - Array de fechas de feriados en formato YYYY-MM-DD
 * @returns {Date} Próximo día hábil
 */
function obtenerProximoDiaHabil(fecha, feriados = []) {
    let fechaActual = new Date(fecha);
    
    while (!esDiaHabil(fechaActual, feriados)) {
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return fechaActual;
}

/**
 * Obtener el próximo día hábil a partir de una fecha (versión async que carga feriados si es necesario)
 * @param {Date} fecha - Fecha de inicio
 * @param {number} diasAdelante - Días a buscar adelante para cargar feriados (default: 30)
 * @returns {Promise<Date>} Próximo día hábil
 */
async function obtenerProximoDiaHabilAsync(fecha, diasAdelante = 30) {
    const fechaDesde = formatearFechaInputLocal(fecha);
    const fechaHastaDate = new Date(fecha);
    fechaHastaDate.setDate(fechaHastaDate.getDate() + diasAdelante);
    const fechaHasta = formatearFechaInputLocal(fechaHastaDate);
    
    // Obtener feriados desde cache, o cargar desde BD si no hay cache
    let feriados = obtenerFeriados(fechaDesde, fechaHasta);
    if (!feriados || feriados.length === 0) {
        feriados = await cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
    }
    return obtenerProximoDiaHabil(fecha, feriados);
}

/**
 * Sumar o restar días hábiles a una fecha (considerando feriados)
 * @param {Date} fecha - Fecha de inicio
 * @param {number} dias - Número de días a sumar (positivo) o restar (negativo)
 * @param {Array<string>} feriados - Array de fechas de feriados en formato YYYY-MM-DD
 * @returns {Date} Fecha resultante después de sumar/restar días hábiles (siempre será un día hábil)
 */
function sumarDiasHabiles(fecha, dias, feriados = []) {
    let fechaActual = new Date(fecha);
    let diasRestantes = Math.abs(dias);
    const direccion = dias >= 0 ? 1 : -1; // 1 para adelante, -1 para atrás
    const fechaInicial = formatearFechaInputLocal(fecha);
    
    // Log de diagnóstico
    console.log('[sumarDiasHabiles] Inicio:', {
        fechaInicial,
        dias,
        direccion: direccion === 1 ? 'adelante' : 'atrás',
        feriadosCount: feriados.length,
        feriadosMuestra: feriados.slice(0, 5)
    });
    
    while (diasRestantes > 0) {
        fechaActual.setDate(fechaActual.getDate() + direccion);
        
        // Si es día hábil, restar un día del contador
        if (esDiaHabil(fechaActual, feriados)) {
            diasRestantes--;
        }
    }
    
    const fechaAntesAjuste = formatearFechaInputLocal(fechaActual);
    
    // Asegurar que el resultado siempre sea un día hábil
    // Si la fecha resultante es un feriado o fin de semana, ajustar en la misma dirección
    let ajustes = 0;
    while (!esDiaHabil(fechaActual, feriados)) {
        const motivoNoHabil = feriados.includes(formatearFechaInputLocal(fechaActual)) ? 'feriado' : 'fin de semana';
        console.log('[sumarDiasHabiles] Ajustando:', {
            fecha: formatearFechaInputLocal(fechaActual),
            motivo: motivoNoHabil
        });
        fechaActual.setDate(fechaActual.getDate() + direccion);
        ajustes++;
        if (ajustes > 30) {
            console.error('[sumarDiasHabiles] Demasiados ajustes, posible loop infinito');
            break;
        }
    }
    
    console.log('[sumarDiasHabiles] Resultado:', {
        fechaInicial,
        fechaAntesAjuste,
        fechaFinal: formatearFechaInputLocal(fechaActual),
        ajustesRealizados: ajustes
    });
    
    return fechaActual;
}

/**
 * Sumar o restar días hábiles a una fecha (versión async que carga feriados si es necesario)
 * @param {Date} fecha - Fecha de inicio
 * @param {number} dias - Número de días a sumar (positivo) o restar (negativo)
 * @param {number} margenDias - Margen de días para cargar feriados (default: 60)
 * @returns {Promise<Date>} Fecha resultante después de sumar/restar días hábiles
 */
async function sumarDiasHabilesAsync(fecha, dias, margenDias = 60) {
    // Calcular rango de fechas para cargar feriados
    const fechaDesdeDate = new Date(fecha);
    const fechaHastaDate = new Date(fecha);
    
    // Si es negativo, necesitamos buscar hacia atrás
    if (dias < 0) {
        fechaDesdeDate.setDate(fechaDesdeDate.getDate() + dias - margenDias);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + margenDias);
    } else {
        fechaDesdeDate.setDate(fechaDesdeDate.getDate() - margenDias);
        fechaHastaDate.setDate(fechaHastaDate.getDate() + dias + margenDias);
    }
    
    const fechaDesde = formatearFechaInputLocal(fechaDesdeDate);
    const fechaHasta = formatearFechaInputLocal(fechaHastaDate);
    
    // Obtener feriados desde cache, o cargar desde BD si no hay cache
    let feriados = obtenerFeriados(fechaDesde, fechaHasta);
    if (!feriados || feriados.length === 0) {
        feriados = await cargarFeriadosDesdeBD(fechaDesde, fechaHasta);
    }
    return sumarDiasHabiles(fecha, dias, feriados);
}

// Exportar funciones
window.cuponesDiasHabiles = {
    obtenerFeriados,
    cargarFeriadosDesdeBD,
    esDiaHabil,
    obtenerProximoDiaHabil,
    obtenerProximoDiaHabilAsync,
    sumarDiasHabiles,
    sumarDiasHabilesAsync
};

